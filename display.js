/*Copyright 2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { toggleIgnoreHandler } from "./events.js"
import { spec } from "./factory.js"
import { Rational,zero,one } from "./rational.js"

class Header {
  constructor(text,colspan) {
    this.text = text
    this.colspan = colspan
  }
}

function changeOverclock(d) {
  let hundred = Rational.from_float(100)
  let twoFifty = Rational.from_float(250)
  let x = Rational.from_string(this.value).floor()
  if (x.less(one)) {
    x = one
  }
  if (twoFifty.less(x)) {
    x = twoFifty
  }
  x = x.div(hundred)
  spec.setOverclock(d.recipe,x)
  spec.updateSolution()
}

// Remember these values from update to update, to make it simpler to reuse
// elements.
let displayedItems = []

export function displayItems(spec,totals,ignore) {
  displayedItems = displayedItems.slice(0,totals.topo.length)
  while (displayedItems.length < totals.topo.length) {
    displayedItems.push({})
  }
  let totalAveragePower = zero
  let totalPeakPower = zero
  let powerShardsUsed = 0
  for (let i = 0; i < totals.topo.length; i++) {
    let recipe = totals.topo[i]
    let display = displayedItems[i]
    let rate = totals.rates.get(recipe)
    let item = recipe.products[0].item
    let itemRate = rate.mul(recipe.gives(item))
    let overclock = spec.getOverclock(recipe)
    let overclockString = overclock.mul(Rational.from_float(100)).toString()
    let { average,peak } = spec.getPowerUsage(recipe,rate,totals.topo.length)
    totalAveragePower = totalAveragePower.add(average)
    totalPeakPower = totalPeakPower.add(peak)
    display.item = item
    display.itemRate = itemRate
    display.recipe = recipe
    display.ignore = ignore.has(recipe)
    display.rate = rate
    display.building = spec.getBuilding(recipe)
    display.count = spec.getCount(recipe,rate)
    display.overclock = overclockString
    display.powerShardCount = display.ignore ? 0 : Math.ceil(Math.max(overclock.toFloat() - 1,0) / 0.5)
    powerShardsUsed += display.powerShardCount
    display.average = average
    display.peak = peak
  }

  let headers = [
    new Header("items/" + spec.format.rateName,2),
    new Header("belts/pipes",2),
    new Header("buildings",2),
    new Header("overclock",powerShardsUsed ? 3 : 1),
    new Header("power",1),
  ]
  let totalCols = 0
  for (let header of headers) {
    totalCols += header.colspan
  }

  let table = d3.select("table#totals")
  table.selectAll('.hide').classed("hide",false);
  let headerRow = table.selectAll("thead tr").selectAll("th")
    .data(headers)
  headerRow.exit().remove()
  headerRow.join("th")
    .text(d => d.text)
    .attr("colspan",d => d.colspan)

  // create missing rows
  let rows = table.selectAll("tbody").selectAll("tr")
    .data(displayedItems)
  rows.exit().remove()
  let row = rows.enter()
    .append("tr")
    .classed("display-row",true)
  // items/m
  row.append("td")
    .append("img")
    .classed("icon item-icon",true)
    .attr("width",32)
    .attr("height",32)
    .on("click",toggleIgnoreHandler)
  row.append("td")
    .classed("right-align",true)
    .append("tt")
    .classed("item-rate",true)
  // belts
  let beltCell = row.append("td")
    .classed("pad",true)
  beltCell.append("img")
    .classed("icon belt-icon",true)
    .attr("width",32)
    .attr("height",32)
  beltCell.append(d => new Text(" \u00d7"))
  row.append("td")
    .classed("right-align",true)
    .append("tt")
    .classed("belt-count",true)
  // buildings
  let pipeCell = row.append("td")
    .classed("pad",true)
  pipeCell.append("img")
    .classed("icon pipe-icon",true)
    .attr("width",32)
    .attr("height",32)
  pipeCell.append(d => new Text(" \u00d7"))
  row.append("td")
    .classed("right-align",true)
    .append("tt")
    .classed("pipe-count",true)
  let buildingCell = row.append("td")
    .classed("pad building",true)
  buildingCell.append("img")
    .classed("icon building-icon",true)
    .attr("width",32)
    .attr("height",32)
  buildingCell.append(d => new Text(" \u00d7"))
  row.append("td")
    .classed("right-align building",true)
    .append("tt")
    .classed("building-count",true)
  /*
  row.filter(d => d.building === null)
      .append("td")
          .attr("colspan", 4)
  */
  // overclock
  let overclockCell = row.append("td")
    .classed("pad building overclock",true)
  overclockCell.append("input")
    .classed("overclock",true)
    .attr("type","number")
    .attr("title","")
    .attr("min",1)
    .attr("max",250)
    .on("input",changeOverclock)
  overclockCell.append(() => new Text("%"))

  // power
  row.append("td")
    .classed("right-align pad building",true)
    .append("tt")
    .classed("power",true)

  // update rows
  row = table.select("tbody").selectAll("tr")
    .classed("nobuilding",d => d.building === null)
  row.selectAll("img.item-icon")
    .classed("ignore",d => d.ignore)
    .attr("src",d => d.item.iconPath())
    .attr("title",d => d.item.name)
  row.selectAll("tt.item-rate")
    .text(d => spec.format.alignRate(d.itemRate))
  row.selectAll("img.belt-icon")
    .attr("src",spec.belt.iconPath())
    .attr("title",spec.belt.name)
  row.selectAll("tt.belt-count")
    .text(d => {
      return d.item.category === "solid" ? spec.format.alignCount(spec.getBeltCount(d.itemRate)) : "";
    })
  d3.selectAll(row.selectAll("tt.belt-count").nodes().filter(d => !d.textContent).map(t => t.parentNode.previousSibling)).classed("hide",true)
  d3.selectAll(row.selectAll("tt.belt-count").nodes().filter(d => !d.textContent).map(t => t.parentNode)).classed("hide",true)
  row.selectAll("img.pipe-icon")
    .attr("src",spec.pipe.iconPath())
    .attr("title",spec.pipe.name)
  row.selectAll("tt.pipe-count")
    .text(d => {
      return d.item.category === "liquid" ? spec.format.alignCount(spec.getPipeCount(d.itemRate)) : ""
    })
  d3.selectAll(row.selectAll("tt.pipe-count").nodes().filter(d => !d.textContent).map(t => t.parentNode.previousSibling)).classed("hide",true)
  d3.selectAll(row.selectAll("tt.pipe-count").nodes().filter(d => !d.textContent).map(t => t.parentNode)).classed("hide",true)

  let buildingRow = row.filter(d => d.building !== null)
  buildingRow.selectAll("img.building-icon")
    .attr("src",d => d.building.iconPath())
    .attr("title",d => d.building.name)
  buildingRow.selectAll("tt.building-count")
    .text(d => spec.format.alignCount(d.count))
  buildingRow.selectAll("input.overclock")
    .attr("value",d => d.overclock)

  // If power shards are used at all...
  if (powerShardsUsed) {

    // ...if the table's power shard column is "collapsed"...
    if (table.classed("power-shard-collapsed")) {
      let powerShard = spec.items.get("power-shard")

      // ...insert a power shard cell after each overclock cell:
      let powerShardCell = buildingRow.insert("td","td.overclock + *")
        .classed("pad building power-shard power-shard-icon",true)
      powerShardCell.append("img")
        .classed("icon",true)
        .attr("src",powerShard.iconPath())
        .attr("title",powerShard.name)
        .attr("width",32)
        .attr("height",32)
      powerShardCell.append(d => new Text(" \u00d7"))

      buildingRow.insert("td","td.power-shard-icon + *")
        .classed("right-align building power-shard",true)
        .append("tt")
        .classed("power-shard-count",true)

      // ...mark the table's power shard column "uncollapsed":
      table.classed("power-shard-collapsed",false)
    }

    // ...update the counts of each power shard cell, and hide any power
    // shard cell with a count of 0:
    buildingRow.selectAll("tt.power-shard-count").text(d => d.powerShardCount)
    buildingRow.selectAll(".power-shard").classed("hide-power-shard",d => d.powerShardCount == 0)
  }

  // Otherwise, remove all power shard cells, and mark the table's power
  // shard column "collapsed":
  else {
    buildingRow.selectAll(".power-shard").remove()
    table.classed("power-shard-collapsed",true)
  }

  buildingRow.selectAll("tt.power")
    .text(d => spec.format.alignCount(d.average) + " MW")
  buildingRow.selectAll(".building")
    .classed("hide-building",d => d.ignore)

  let totalPower = [totalAveragePower,totalPeakPower]
  let footerPowerRow = table.selectAll("tfoot tr.power")
  footerPowerRow.select("td.label")
    .attr("colspan",totalCols - 1)
  footerPowerRow.select("tt")
    .data(totalPower)
    .text(d => spec.format.alignCount(d) + " MW")

  let footerPowerShardRow = table.select("tfoot tr.power-shard")
  footerPowerShardRow.select("td.label")
    .attr("colspan",totalCols - 1)
  footerPowerShardRow.select("tt")
    .text(powerShardsUsed)
}
