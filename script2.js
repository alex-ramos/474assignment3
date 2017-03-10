/*
  Alex Ramos
  INFO 474
  3/9/17
*/

//variables to build view
var width = 960,
    height = 700;

var shapeFilter = "all";

var yearBins = {};

var b;

var fDates;

var projection = d3.geoAlbersUsa()
    .translate([(width / 2), 300])
    .scale(1275);

var path = d3.geoPath(); // tell path generator to use albersUsa projection

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
var zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [width, height]]).extent([[0, 0], [width, height]])
    .on("zoom", zoomed);
var g = svg.append("g");

var tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

var filtered; 

svg
    .call(zoom);

//Load US map data
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

//Load UFO sighting data and create initial views
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
  filtered = dataset;
});

//Funcition to plot sightings on the Map
function drawMap(dataset) { //draw the circiles initially and on each interaction with a control
    var circle =  g.selectAll("circle")
    .data(dataset);

    circle
    .attr("r", 2)
    .attr("transform", function(d) {
    return "translate(" + projection([
        d.longitude,
        d.latitude])
      + ")";
      });

    circle.exit().remove();

    //Mousing over Sightings shows tooltip
    circle.enter().append("circle").attr("r", 2)
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

//Reset Vis to intial view
function drawVis(dataset){
   drawMap(dataset);
   drawHist(dataset);
 }


//Filter Sighting by UFO shape
function filterShape(myshape) {
  filtered = dataset;
  //add code to filter to mytype and rerender vis here
  if(myshape == "all"){
    shapeFilter = "all";
    return dataset;
  }else{
    var ndata = filtered.filter(function(d){
      shapeFilter = myshape;
      return d["shape"] == myshape;
    });
    return ndata;
  }
}

//Filter data by dates on slider
function filterDates(dates){
  var gdata = filterShape(shapeFilter);
  var ndata = gdata.filter(function(d){
    return (new Date(d["datetime"]).getFullYear()) < dates[1] && (new Date(d["datetime"]).getFullYear()) > dates[0];
  });
    filtered = ndata;

  drawVis(ndata);
}

//filter data by histogram bar
function filterDuration(dur){
  //var gdata = filterDates(fDates);
  var ndata = filtered.filter(function(d){
    return d["durationSec"] => dur.x0 && d["durationSec"] < dur.x1;
  });
  drawVis(ndata);
}

//create dropdown
$(document).ready(function(){
  $("#dropdown").change(
  function(){
    drawVis(filterShape(this.value));
});});

//create slider
function createSlider(dataset) {
  $( "#date" ).slider({
    range: true,
    min: 1950,
    max: 2014, values: [ 1950, 2014 ],
    slide: function( event, ui ) {
      $( "#dateamount" ).val(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
       fDates = ui.values;
       filterDates(ui.values);
    } //end slide function
  }); //end slider
  $( "#dateamount" ).val((1950) +
      " - " + (2014));
}

//function to handle zoom
function zoomed() {
    g.attr("transform", d3.event.transform);
  console.log("zooom");
}

var formatCount = d3.format(",.0f");
var bins;

//draws histogram
function drawHist(dataset){
  d3.select("#hist").selectAll("svg").remove();

  var svg2 = d3.select("#hist").append("svg").attr("width", 1100).attr("height", 780);
  var margin = {top: 30, right: 30, bottom: 50, left: 30}
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
        .attr("width", 100)
        .attr("height", function(d) { 
          var h =  (height - y(d.length)) - margin.bottom;
          if(h <=0 ){
            return 0;
          } 
          return h;
        })
        .on("click", 
          function(d){
            var coords = d3.event.pageX;
            b = Math.floor((coords-margin.left)/100);
            filterDuration(bins[b]);
          });

    bar.append("text")
        .attr("dy", "5px")
        .attr("y", -8)
        .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.length); });

    g2.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + (height - 50) + ")")
      .call(d3.axisBottom(x))     
        .append("text")
      .attr("transform",
            "translate(" + (550) + " ," + 
                           (780 - margin.bottom) + ")")
        .style("text-anchor", "end")
        .text("Time (sec)");
    
}

//Gets column of duration times from the dataset
function getDurationColumn(dataset){
    var col = [];
    for(var i = 0; i < dataset.length; i++){
      col[i] = (dataset[i].durationSec);
    }
    return col;
}

//clear filter functionality
$( "#clear" ).click(function(){
  filtered = dataset;
  drawVis(dataset);
});