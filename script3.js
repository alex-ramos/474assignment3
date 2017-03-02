var width = 960,
    height = 700;

var shapeFilter = "all";

var yearBins = {};

var projection = d3.geoAlbersUsa()
    .translate([(width / 2), 300])
    .scale(1275);

var path = d3.geoPath(); // tell path generator to use albersUsa projection

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
var zoom = d3.zoom().scaleExtent([1, 8])
    .on("zoom", zoomed);
var g = svg.append("g");

var tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);


svg
    .call(zoom); 

d3.json("https://d3js.org/us-10m.v1.json", function(error, us) {
  if (error) throw error;

  g.append("g")
      .attr("class", "states")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path);

  g.append("path")
      .attr("class", "state-borders")
      .attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })));
});

var dataset; //the full dataset

d3.csv("usOyr.csv", function(UFO){
  UFO.forEach(function(d){
    d.datetime = new Date(d.datetime);
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
    d.durationSec = +d.durationSec
  });
  dataset = UFO;
  drawVis(dataset);
  createSlider(dataset);
  yearBins = getYearBins(dataset);
  //drawLine(yearBins);

});


function drawMap(dataset) { //draw the circiles initially and on each interaction with a control
    var circle =  g.selectAll("circle")
    .data(dataset);

    circle
    .attr("r", 1.5)
    .attr("transform", function(d) {
    return "translate(" + projection([
        d.longitude,
        d.latitude])
      + ")";
      });

    circle.exit().remove();

    circle.enter().append("circle") .attr("r", .75)
    .attr("transform", function(d) {
    return "translate(" + projection([
        d.longitude,
        d.latitude])
      + ")";
      })        
    .on("mouseover", function(d){ 
        tooltip.transition().duration(200).style('opacity', 90);
        tooltip.html("<p><strong>Location:</strong> " + d.city + ", " + d.state + "</p>" + 
                     "<p><strong>Duration:</strong>  " + d.durationHrMin + " <strong>Year:</strong> " + d.year + "</p>" +
                     "<p><strong>Comments:</strong>  " + d.comments + "</p>")
        .style('left', (d3.event.pageX + 5)+ 'px')
        .style('top', (d3.event.pageY + 10)+ 'px')
        .style('position', 'absolute');
        })
    .on("mouseout", function(d){
      tooltip.transition(200).style('opacity', 0);
    });
}

function drawVis(dataset){
   drawMap(dataset);
   drawHist(dataset);
 }

//to filter w radio buttons must add each seleciton to array and only choose from those 
//on all clear array and use whole dataset
function filterShape(myshape) {
  //add code to filter to mytype and rerender vis here
  if(myshape == "all"){
    shapeFilter = "all";
    return dataset;
  }else{
    var ndata = dataset.filter(function(d){
      shapeFilter = myshape;
      return d["shape"] == myshape;
    });
    return ndata;
  }
}

function filterDates(dates){
  var dfil = filterShape(shapeFilter);
  var ndata = dfil.filter(function(d){
    return (new Date(d["datetime"]).getFullYear()) < dates[1] && (new Date(d["datetime"]).getFullYear()) > dates[0];
  });
  drawVis(ndata);
}

$(document).ready(function(){
  $("#dropdown").change(
  function(){
    drawVis(filterShape(this.value));
});});

function createSlider(dataset) {
  $( "#date" ).slider({
    range: true,
    min: 1950,
    max: 2014, values: [ 1950, 2014 ],
    slide: function( event, ui ) {
      $( "#dateamount" ).val(ui.values[ 0 ] + " - " + ui.values[ 1 ] ); filterDates(ui.values);
    } //end slide function
  }); //end slider
  $( "#dateamount" ).val((1950) +
      " - " + (2014));
}

function getYearBins(dataset){
    var col = [];
    var map = {};
    for(var i = 0; i < dataset.length; i++){
      col[i] = (dataset[i].datetime.getFullYear());
    }
    for(var x = 0; x < col.length; x++){
      if(contains(col[x], map)){
        map[col[x]] =  map[col[x]] + 1;
      }else{
        map[col[x]] = 1;
      }
    }
    return map;
}

function contains(key, dict){
  for(k in dict){
    if(key == k)
      return true;
  }
  return false;
}


function zoomed() {
  g.attr("transform", d3.event.transform);
  console.log("event");
}

var formatCount = d3.format(",.0f");
var bins;

function drawHist(dataset){
  d3.select("#hist").selectAll("svg").remove();

  var svg2 = d3.select("#hist").append("svg").attr("width", 1100).attr("height", 780);
  var margin = {top: 10, right: 30, bottom: 30, left: 30}
  var g2 = svg2.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var durations = getDurationColumn(dataset);

  var x = d3.scaleLinear()
    .domain([.01, 1000])
    .rangeRound([0, width]);

  bins = d3.histogram()
    .thresholds(x.ticks(8))
    (durations);

  var y = d3.scaleLinear()
    .domain([0, d3.max(bins, function(d) { return d.length; })])
    .range([height, 0]);

  var bar = g2.selectAll(".bar")
      .data(bins).enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
        .attr("height", function(d) { return (height - y(d.length)) - margin.bottom; });
//if event.getX is within a certain range you can get the bar
//use this to filter the threshold

    bar.append("text")
        .attr("dy", "5px")
        .attr("y", -8)
        .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.length); });

    g2.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + (height - 30) + ")")
      .call(d3.axisBottom(x))     
        .append("text")
      .attr("transform",
            "translate(" + (550) + " ," + 
                           (780 - margin.bottom + 20) + ")")
        .style("text-anchor", "end")
        .text("Time (sec)");
    
}

function getDurationColumn(dataset){
    var col = [];
    for(var i = 0; i < dataset.length; i++){
      col[i] = (dataset[i].durationSec);
    }
    return col;
}
