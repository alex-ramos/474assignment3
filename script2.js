/*
Info 474 Assignment 3 pt A
Alex Ramos
*/

//variables for first svg to hold map
var width = 960,
    height = 700;

var shapeFilter = "all";

var yearBins = {};

//variables to draw map of USA
var projection = d3.geoAlbersUsa()
    .translate([(width / 2), 300])
    .scale(1275);

var path = d3.geoPath(); // tell path generator to use albersUsa projection

//svg to hold map
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

//zoom functionality on map
var zoom = d3.zoom().scaleExtent([1, 8])
    .on("zoom", zoomed);
var g = svg.append("g");

var tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);


svg
    .call(zoom); 

//Load JSON files and draw US map
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

//Load csv of UFO sightings
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

//Draw the UFO sightings on the map of the USA
function drawMap(dataset) { 
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

    //circles are placed on the map where the sighting occures
    //Tooltip on hover for the circles
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

//Filter by the classified shape of the ufo
function filterShape(myshape) {
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

$(document).ready(function(){
  $("#dropdown").change(
  function(){
    drawVis(filterShape(this.value));
});});


//Filter between the dates set by the slider
function filterDates(dates){
  var dfil = filterShape(shapeFilter);
  var ndata = dfil.filter(function(d){
    return (new Date(d["datetime"]).getFullYear()) < dates[1] && (new Date(d["datetime"]).getFullYear()) > dates[0];
  });
  drawVis(ndata);
}

//function that creates the slider and places it into the HTML
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

//Function that handles the zoom interaction
function zoomed() {
  g.attr("transform", d3.event.transform);
  console.log("event");
}


//Draw the Histogram view
var formatCount = d3.format(",.0f");
var bins;

//Draw histogram showing distribution of duration of UFOs
function drawHist(dataset){

  //Could not figure out how the update without redrawing histogram, so must erase old one first
  d3.select("#hist").selectAll("svg").remove();

  //SVG that holds the histogram
  var svg2 = d3.select("#hist").append("svg").attr("width", 1100).attr("height", 780);
  var margin = {top: 10, right: 30, bottom: 30, left: 30}
  var g2 = svg2.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var durations = getDurationColumn(dataset);

  //set x scale
  var x = d3.scaleLinear()
    .domain([.01, 1000])
    .rangeRound([0, width]);

  //Create bins of data 
  bins = d3.histogram()
    .thresholds(x.ticks(8))
    (durations);

  var y = d3.scaleLinear()
    .domain([0, d3.max(bins, function(d) { return d.length; })])
    .range([height, 0]);

  //add bars to histogram and label
  var bar = g2.selectAll(".bar")
      .data(bins).enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
        .attr("height", function(d) { return (height - y(d.length)) - margin.bottom; });
    bar.append("text")
        .attr("dy", "5px")
        .attr("y", -8)
        .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.length); });

    //add x axis
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

//retrieve duration times from the dataset
function getDurationColumn(dataset){
    var col = [];
    for(var i = 0; i < dataset.length; i++){
      col[i] = (dataset[i].durationSec);
    }
    return col;
}
