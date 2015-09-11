dojo.require("esri.graphic");		
dojo.require("esri.geometry");
dojo.require("esri.symbol");

//to draw arrow
	var angle;
	var arrowEnd;

//to draw activity polylines (and display text)
	var thisAnum, nextAnum, latitude1, longitude1, eventID;
	var polylineSymbol;
	var polyline;
	var polylineGraphic;
	var startPolyline, endPolyline; 
	var clickedGraphic;
	var textSymbol;
	var labelPointGraphic;

	
	
	//ICD class objects for clock and point features	 
	var ICD = function(instanceName) {
		this.instanceName = instanceName;
		this.parentNode;
		this.svgRoot;
		this.graphicParent;
		this.svgNS = "http://www.w3.org/2000/svg";
		this.activityHeader = [];
		this.activities = [];
		this.activityStyles = [];
		this.annulusOpacity = 0.75;
		this.annulusRadius = 40;
		this.maxTime = 86400;
		this.divisions = 24;
		this.linkedMap;
		this.linkedFeatLayer;
	}

//clear the parentNode's contents, and create the ticks / labels / axis
ICD.prototype.Initialize = function() {
	
		
		//if the parentNode has any children, remove them
		while (this.parentNode.childNodes.length > 0) {
			this.parentNode.removeChild(this.parentNode.childNodes[0]);
		}

//remove any popups
//if there is a linkedFeatLayer with graphics, remove the popup for the corresponding map feature
		if (this.linkedMap.infoWindow) {
			if (this.linkedFeatLayer) {
				if (this.linkedFeatLayer.graphics.length > 0) {
					this.linkedMap.infoWindow.clearFeatures();
					this.linkedMap.infoWindow.hide();
				}
			}
		}

//Define clock params
		this.svgRoot = document.createElementNS(this.svgNS, "svg");
		this.svgRoot.setAttribute("width", "150");
		this.svgRoot.setAttribute("height", "150");
		this.svgRoot.setAttribute("version", "1.1");
		this.svgRoot.setAttribute("id", "svgelement");

		this.graphicParent = document.createElementNS(this.svgNS, "g");
		this.graphicParent.setAttribute("transform", "translate(75,75)");

		var newCircle = document.createElementNS(this.svgNS, "circle");
		newCircle.setAttribute("cx", "0");
		newCircle.setAttribute("cy", "0");
		newCircle.setAttribute("r", "50");
		newCircle.setAttribute("fill", "none");
		newCircle.setAttribute("stroke-width", "1");
		newCircle.setAttribute("stroke", "#888888");
		this.graphicParent.appendChild(newCircle);

		//create a center circle (to be used as a mouseover indicator)
		var newCircle = document.createElementNS(this.svgNS, "circle");
		newCircle.setAttribute("cx", "0");
		newCircle.setAttribute("cy", "0");
		newCircle.setAttribute("r", "25");
		newCircle.setAttribute("fill", "none");
		newCircle.setAttribute("opacity", this.annulusOpacity);
		newCircle.setAttribute("stroke-width", "1");
		newCircle.setAttribute("stroke", "#888888");
		newCircle.setAttribute("stroke-dasharray", "5 2");
		newCircle.setAttribute("id", "mouseoverIndicator");
		this.graphicParent.appendChild(newCircle);

		//create a text element at the center of the indicator
		var indText = document.createElementNS(this.svgNS, "text");
		indText.setAttribute("x", "0");
		indText.setAttribute("y", "0");
		indText.setAttribute("text-anchor", "middle");
		indText.setAttribute("fill", "black");
		indText.setAttribute("font-size", "12");
		indText.setAttribute("font-family", "Arial");
		indText.setAttribute("id", "mouseoverIndicatorText");
		indText.textContent = "";
		this.graphicParent.appendChild(indText);

		this.svgRoot.appendChild(this.graphicParent);
		this.parentNode.appendChild(this.svgRoot);

		//draw clock ticks
		this.CreateTicks(this.divisions);

		//define activity styles
		this.activityStyles = [];
		this.activityStyles.push([1, "#77BB88", "Home"]);
		this.activityStyles.push([2, "#FF0000", "Work"]);
		this.activityStyles.push([3, "#550055", "Shop"]);
		this.activityStyles.push([4, "#558800", "Other"]);
		this.activityStyles.push([5, "#0000FF", "School"]);
		this.activityStyles.push([6, "#0000FF", "College"]);
	}

//generate clock 
ICD.prototype.CreateTicks = function(divisions) {

		for (var i = 0; i < divisions; i++) {
			var currentRotation = (i / (divisions * 1.0)) * 360.0;
			var tickGroup = document.createElementNS(this.svgNS, "g");
			tickGroup.setAttribute("transform", "rotate(" + currentRotation.toString() + ",0,0)");
			var tickLine = document.createElementNS(this.svgNS, "line");
			tickLine.setAttribute("x1", "0");
			tickLine.setAttribute("y1", "-45");
			tickLine.setAttribute("x2", "0");
			tickLine.setAttribute("y2", "-55");
			tickLine.setAttribute("stroke-width", "1");
			tickLine.setAttribute("stroke", "#888888");
			tickGroup.appendChild(tickLine);
			//only label even hours
			if (i % 2 == 0) {
				var tickTextGroup = document.createElementNS(this.svgNS, "g");
				tickTextGroup.setAttribute("transform", "rotate(-" + currentRotation.toString() + ",0,-64)");

				var tickText = document.createElementNS(this.svgNS, "text");
				tickText.setAttribute("x", "0");
				tickText.setAttribute("y", "-60");
				tickText.setAttribute("text-anchor", "middle");
				tickText.setAttribute("fill", "grey");
				tickText.setAttribute("font-size", "12");
				tickText.setAttribute("font-family", "Arial");
				var currentTxtVal = i;
				if (currentTxtVal == 0) { currentTxtVal = divisions }
				tickText.textContent = currentTxtVal.toString();
				tickTextGroup.appendChild(tickText);
				tickGroup.appendChild(tickTextGroup);
			}

			this.graphicParent.appendChild(tickGroup);

			delete tickGroup;
			delete tickTextGroup;
			delete tickText;
			delete tickLine;

		}

	}
	
//Generate Activity Info from CSV file
	ICD.prototype.LoadActivityData = function(CSVdata) {

		var rawActivityList = CSVdata.split("\n");
		var tempActivities = [];
		var tempActivitiesHeader = [];
		for (var i = 0; i < rawActivityList.length; i++) {
			if (rawActivityList[i].split(",").length == 6) {
				if (i == 0) {
					tempActivitiesHeader = rawActivityList[i].split(",");
				}
				else {
					tempActivities.push(rawActivityList[i].split(","));
				}
			}
		}

		this.activities = tempActivities;
		this.activityHeader = tempActivitiesHeader;

		//obsolete:  we added tempActivitiesHeader to catch the field names
		//the first item in the resulting list is the headers; we should drop these
		//(anum, purpose, starttime, duration, longitude, latitude)
		//this.activities = tempActivities.splice(1, tempActivities.length - 1);

	}

//Getter Function: Generate Activity Info from CSV file
ICD.prototype.LoadActivityDataDirect = function(header, data) {

		this.activities = data;
		this.activityHeader = header;

		//obsolete:  we added tempActivitiesHeader to catch the field names
		//the first item in the resulting list is the headers; we should drop these
		//(anum, purpose, starttime, duration, longitude, latitude)
		//this.activities = tempActivities.splice(1, tempActivities.length - 1);

	}

//Populates center part of the Activitites Clock with Color and Activity type
ICD.prototype.HighlightData = function(eventID)  {
		if (eventID != "" && eventID != null) {
			eventID = Number(eventID);
			//get current activity type
			//issue:  the eventID received by this function may not correspond to the list index;
			//there is no guarantee that activities' id numbers (anum) will begin with zero
			//to do....fix this...
			
			var actType = this.activities[eventID][1];
			var moIndicator = this.svgRoot.getElementById("mouseoverIndicator");
			moIndicator.setAttribute("fill", this.activityStyles[actType - 1][1]);		
			var moIndicatorTxt = this.svgRoot.getElementById("mouseoverIndicatorText");
			moIndicatorTxt.textContent = this.activityStyles[actType - 1][2];

		}
		else {
			//clear all highlighting
			var moIndicator = this.svgRoot.getElementById("mouseoverIndicator");
			moIndicator.setAttribute("fill", "none");
			var moIndicatorTxt = this.svgRoot.getElementById("mouseoverIndicatorText");
			moIndicatorTxt.textContent = "";
		}
	}

	//Handles Activity Feature Selection everytime click is made on activity point on map OR clock
	//eventID refers to activity's anum attribute. 
	ICD.prototype.SelectData = function(eventID) {

	   if (eventID != "" && eventID != null) {
			eventID = Number(eventID);
			
			//add an outline to the related annulus, and extend to the center of the clock
			//first, unselect all data
			var unselResult = this.SelectData("","");
			if (unselResult.unselected[0] != eventID) {
				//find the selected annulus
				var svgPaths = this.svgRoot.getElementsByTagNameNS(this.svgNS, "path");
				for (var i = 0; i < svgPaths.length; i++) {
					if (svgPaths[i].getAttribute("data") == eventID) {  		   
								
						if (svgPaths[i].getAttribute("data_sel") == false || svgPaths[i].getAttribute("data_sel") == "false") {
							//this is the annulus to be selected
							svgPaths[i].setAttribute("data_sel", true);
							var newStrokeWidth = Number(svgPaths[i].getAttribute("stroke-width")) * 2;
							svgPaths[i].setAttribute("stroke-width", newStrokeWidth);

							if (this.linkedMap.infoWindow) {
								if (this.linkedFeatLayer) {
									if (this.linkedFeatLayer.graphics.length > 0) {
										this.linkedMap.infoWindow.setFeatures([this.linkedFeatLayer.graphics[eventID]]);
										this.linkedMap.infoWindow.select(0);
										this.linkedMap.infoWindow.show(this.linkedFeatLayer.graphics[eventID].geometry);
																		
									}
								}
							}
						
						//derive anum attribute for this activity point and next activity point
						thisAnum = this.linkedFeatLayer.graphics[eventID].attributes.anum;
						thisAnum = Number(thisAnum);
						nextAnum = thisAnum + 1;
						nextAnum = Number(nextAnum);				
						
						//	deleting previous polyline and text graphics
						if(polyline){
						this.linkedFeatLayer.remove(polylineGraphic);
						this.linkedFeatLayer.remove(arrowEnd);		
						this.linkedFeatLayer.remove(labelPointGraphic);	     		
						this.linkedFeatLayer.redraw();		
						}
														 
						// polyline graphic
						polyline = new esri.geometry.Polyline(new esri.SpatialReference({wkid:102100}));
						polylineSymbol = new esri.Graphic(polyline, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, new dojo.Color([65, 105, 205]), 5));
						//	polylineGraphic = new esri.Graphic(polyline, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_LONGDASH, new dojo.Color([0,0,205]), 5), textSymbol);
						polylineGraphic = new esri.Graphic(polyline, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, new dojo.Color([65, 105, 205]), 5));
			 
						//polyline properties
						if(this.linkedFeatLayer.graphics[nextAnum]){
						longitude1 = this.linkedFeatLayer.graphics[eventID].attributes.longitude;
						latitude1 = this.linkedFeatLayer.graphics[eventID].attributes.latitude;		
						longitude2 = this.linkedFeatLayer.graphics[nextAnum].attributes.longitude;
						latitude2 = this.linkedFeatLayer.graphics[nextAnum].attributes.latitude;		
					
						startPolyline = esri.geometry.geographicToWebMercator(new esri.geometry.Point(longitude1, latitude1));
						endPolyline = esri.geometry.geographicToWebMercator(new esri.geometry.Point(longitude2, latitude2));		
						polyline.addPath([startPolyline,endPolyline]);		
			
						//draw polyline
						this.linkedFeatLayer.add(polylineGraphic);	
						this.linkedFeatLayer.refresh();
						
						//To Draw Arrow
						/* Arrow Slope Formula:
						run = longitude2 - longitude1
						rise = latitude2 - latitude1
						*/
						var rise = latitude2 - latitude1;
						var run = longitude2 - longitude1;
						var arrowLocation = polyline.getExtent().getCenter();
						angle = (180/Math.PI) * Math.atan2(run, rise);
						
						//slope epsilon is - (angle/20)
						angle = angle - (angle/50);
						console.log("angle: ", angle, 360 - angle);
						
						//url of arrow image
						//http://static.arcgis.com/images/Symbols/Arrows/icon30.png
						arrowEnd = new esri.Graphic(
						arrowLocation, new
						esri.symbol.PictureMarkerSymbol("http://static.arcgis.com/images/Symbols/Arrows/icon30.png",
						35, 35).setAngle(angle)
						);
						this.linkedFeatLayer.add(arrowEnd);		 
						this.linkedFeatLayer.refresh();
					
						}
						else {
						console.log("Warning: This is the last activity for this PID! Please select another activity.");
						//note: this text will be populated from "" to "final destination" if text alignment issue is solved
						var textFont = new esri.symbol.Font(21, esri.symbol.Font.STYLE_NORMAL, esri.symbol.Font.VARIANT_NORMAL, esri.symbol.Font.WEIGHT_BOLDER, "Arial"); 
						var textLabelContent = ""; //to be used in the future for another file
						textSymbol =  new esri.symbol.TextSymbol(textLabelContent, textFont);
						textSymbol.setColor(new dojo.Color([0, 0, 0]));
						textSymbol.setOffset(-30,-30);
						labelPointGraphic = new esri.Graphic(endPolyline, textSymbol);
						this.linkedFeatLayer.add(labelPointGraphic);		 
						this.linkedFeatLayer.refresh();
											
						}						
									
						
						}
						
						else if (svgPaths[i].getAttribute("data_sel") == true || svgPaths[i].getAttribute("data_sel") == "true") {
						
							//the annulus is already selected; de-select it
							svgPaths[i].setAttribute("data_sel", false);
							var newStrokeWidth = Number(svgPaths[i].getAttribute("stroke-width")) / 2;
							svgPaths[i].setAttribute("stroke-width", newStrokeWidth);

							//if there is a linkedFeatLayer with graphics, remove the popup for the corresponding map feature
							if (this.linkedMap.infoWindow) {
								if (this.linkedFeatLayer) {
									if (this.linkedFeatLayer.graphics.length > 0) {
										this.linkedMap.infoWindow.clearFeatures();
										this.linkedMap.infoWindow.hide();
							
									}
								}
							}
							

						}

						else {
							//unknown situation
							alert("error");
						}

					}
				}
			}
		}
		else {
			//scan over all annuli and be sure none are selected
			var unSelectedList = [];
			var svgPaths = this.svgRoot.getElementsByTagNameNS(this.svgNS, "path");
			for (var i = 0; i < svgPaths.length; i++) {
				if (svgPaths[i].getAttribute("data_sel") == true || svgPaths[i].getAttribute("data_sel") == "true") {
					//this is the selected annulus; de-select it
					svgPaths[i].setAttribute("data_sel", false);
					var newStrokeWidth = Number(svgPaths[i].getAttribute("stroke-width")) / 2
					svgPaths[i].setAttribute("stroke-width", newStrokeWidth);
					unSelectedList.push(svgPaths[i].getAttribute("data"));

				}
			}

			//if there is a linkedFeatLayer with graphics, remove the popup for the corresponding map feature
			if (this.linkedMap.infoWindow) {
				if (this.linkedFeatLayer) {
					if (this.linkedFeatLayer.graphics.length > 0) {
						this.linkedMap.infoWindow.clearFeatures();
						this.linkedMap.infoWindow.hide();
					}
				}
			}

			return { unselected: unSelectedList }

		}
	}

	//Create clock annuli based on following attributes:
	//anum, purpose, starttime, duration, longitude, latitude
	ICD.prototype.createAnnuli = function() {
		if (this.activities.length > 0) {
			for (var i = 0; i < this.activities.length; i++) {
				var ActStartTime = Number(this.activities[i][2]);
				var ActDuration = Number(this.activities[i][3]);
				var ActEndTime = ActStartTime + ActDuration;

				var ActStartAngle = (ActStartTime / this.maxTime) * 360.0;
				var ActEndAngle = (ActEndTime / this.maxTime) * 360.0;
				var LargeAngle = 0;
				if (ActEndAngle - ActStartAngle > 180.0) {
					LargeAngle = 1;
				}

				//on the start and end points, flip the sign of the y coordinate (svg image space)
				var StartPt = [this.annulusRadius * Math.sin(ActStartAngle * (Math.PI / 180.0)), -this.annulusRadius * Math.cos(ActStartAngle * (Math.PI / 180.0))];
				var EndPt = [this.annulusRadius * Math.sin(ActEndAngle * (Math.PI / 180.0)), -this.annulusRadius * Math.cos(ActEndAngle * (Math.PI / 180.0))];

				var ActColor = this.activityStyles[Number(this.activities[i][1]) - 1][1];

				//<path d="M0,0 L40,0 A40,40 0 0,1 0,40" stroke="blue" stroke-width="2" fill="none"/>

				var annulusPath = document.createElementNS(this.svgNS, "path");

				annulusPath.setAttribute("d", "M0,0 M" + StartPt[0].toString() + "," + StartPt[1].toString() + " A" + this.annulusRadius.toString() + "," + this.annulusRadius.toString() + " 0 " + LargeAngle.toString() + ",1 " + EndPt[0] + "," + EndPt[1]);
				annulusPath.setAttribute("stroke", ActColor);
				annulusPath.setAttribute("stroke-width", "10");
				annulusPath.setAttribute("fill", "none");
				annulusPath.setAttribute("opacity", this.annulusOpacity);
				//data:
				annulusPath.setAttribute("data", this.activities[i][0]);
				annulusPath.setAttribute("data_sel", false);
				//interactivity:
				annulusPath.setAttribute("onmouseover", this.instanceName + ".HighlightData('" + this.activities[i][0] + "')");
				annulusPath.setAttribute("onmouseout", this.instanceName + ".HighlightData('')");
			  //  annulusPath.setAttribute("onclick", this.instanceName + ".SelectData('" + this.activities[i][0] +","+this.activities+"')");
				annulusPath.setAttribute("onclick", this.instanceName + ".SelectData('" + this.activities[i][0] +"')");
				
				this.graphicParent.appendChild(annulusPath);

				delete annulusPath;
				delete ActColor;
				delete EndPt;
				delete StartPt;
				delete LargeAngle;
				delete ActEndAngle;
				delete ActStartAngle;
				delete ActEndTime;
				delete ActDuration;
				delete ActStartTime;


			}
		}
		else {
			//no activities defined; can't create annuli
			alert("Cannot create Annuli; No activities defined");
		}

	}

	ICD.prototype.GraphicClickHandler = function(evt) {
	clickedGraphic = evt.graphic;
	eventID = clickedGraphic.attributes.anum;
	this.SelectData(eventID, this.activities);
	this.HighlightData(clickedGraphic.attributes.anum);
	}

	//Prototype to convert seconds to hh:mm:ss
	String.prototype.toHHMMSS = function () {
		var sec_num = parseInt(this, 10); 
		var hours   = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);
		if (hours   < 10) {hours   = "0"+hours;}
		if (minutes < 10) {minutes = "0"+minutes;}
		if (seconds < 10) {seconds = "0"+seconds;}
		var time    = hours+':'+minutes+':'+seconds;
		return time;
	}

	
//Format Activity "Purpose" attribute to readable format in Infowindow
//Shows activity purpose number AND text
function convertPurpose(value, key, data){
	var result = "";
	switch(key) {
			  case "purpose":
				if (data.purpose == "1") {
				result = "1 (Home)";
				}
				else if (data.purpose == "2") {
				result = "2 (Work)";
				}	
				else if (data.purpose == "3") {
				result = "3 (Shop)";
				}
					else if (data.purpose == "4") {
				result = "4 (Other)";
				}
					else if (data.purpose == "5") {
				result = "5 (School)";
				}	
				else if (data.purpose == "6") {
				result = "6 (College)";
				}
				break;

				 }
	return result;
	}

//Format Activity "Duration" attribute to readable format in Infowindow
//Shows Seconds and HH:MM:SS format
	function convertDuration(value, key, data){
	var result = "";
	var durationMinutes = 0;
	var durationSeconds = 0;
	var durationHHMMSS = "";

	switch(key) {
			  case "duration":
				durationSeconds = data.duration;
				durationMinutes = (data.duration)/3600;
				durationMinutes = Math.floor(durationMinutes);
				
				durationHHMMSS = durationSeconds.toString().toHHMMSS();
				result = durationSeconds + " (" + durationHHMMSS.toString() + ")" ;
				break;

			}
	return result;
	}

//Format Activity "Start Time" attribute to readable format in Infowindow
//Shows Seconds and HH:MM:SS format
	function convertStarttime(value, key, data) {
	var result = "";
	var startTimeMinutes = 0;
	var startTimeSeconds = 0;
	var startTimeHHMMSS = "";

	switch(key) {
			  case "starttime":
				startTimeSeconds = data.starttime;
				startTimeMinutes = (data.starttime)/3600;
				startTimeMinutes = Math.floor(startTimeMinutes);
				startTimeHHMMSS = startTimeSeconds.toString().toHHMMSS();
				result = startTimeSeconds + " (" + startTimeHHMMSS.toString() + ")" ;
				break;
			}
	return result;
	}	
	
//Generate Point Features on Maps
ICD.prototype.CreateMapFeatures = function() {
		//this function creates map features using a graphics layer
		if (this.linkedFeatLayer) {
			this.linkedFeatLayer.clear();
		}
		else {
			this.linkedFeatLayer = new esri.layers.GraphicsLayer({ id: "ICD_mapfeatures" });
			this.linkedMap.addLayer(this.linkedFeatLayer);
		}

		//picture marker symbol
		var pictureSVGstring = "data:image/svg+xml,%3Csvg%20width%3D%27100%27%20height%3D%27100%27%20viewBox%3D%270%200%20100%20100%27%20version%3D%271.1%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Ccircle%20cx%3D%2750%27%20cy%3D%2750%27%20r%3D%2750%27%20fill%3D%27%23000000%27%20fill-opacity%3D%270.123%27%20stroke-width%3D%271%27%20stroke%3D%27black%27%20/%3E%3C/svg%3E"
		//set symbol
		var sms = new esri.symbol.SimpleMarkerSymbol();
		sms.setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE);
		sms.setColor(new dojo.Color([0, 255, 0, 0.75]));
	 
	  var activityInfoTemplate = new esri.InfoTemplate();
	  activityInfoTemplate.setTitle("Activity Details");
	  activityInfoTemplate.setContent("<b>Activity #: </b>${anum}<br/>" + "<b>Purpose: </b>${purpose:convertPurpose}<br/>" + "<b>Start Time: </b>${starttime:convertStarttime}<br/>" + "<b>Longitude: </b>${longitude}<br/>" + "<b>Latitude: </b>${latitude}<br/>"+ "<b>Duration: </b>${duration:convertDuration}");
	  //for each activity (occurring at a discrete location) create a point
		for (var i = 0; i < this.activities.length; i++) {
			//pull attributes out
			var attr = [];
			for (var j = 0; j < this.activityHeader.length; j++) {
				attr[this.activityHeader[j]] = this.activities[i][j]
			}
		
			//check activity type
			var activityPurpose = this.activities[i][1];
			var actAnum = this.activities[i][0];
			var thisActivity = actAnum;
			var nextActivity;		
			if ((i+1) < this.activities.length) {		
			nextActivity = this.activities[i+1][0];	
			thisActivity = Number(thisActivity);
			nextActivity = Number(nextActivity);
			
						
		}
			//create a new picturemarkersymbol for this event
			var imgData = pictureSVGstring.replace("000000", this.activityStyles[Number(activityPurpose) - 1][1].replace("#", "")).replace("0.123", this.annulusOpacity);
			var pms = new esri.symbol.PictureMarkerSymbol(imgData, 20, 20);

			//create graphic
			var geometry = esri.geometry.geographicToWebMercator(new esri.geometry.Point(this.activities[i][4], this.activities[i][5], map.spatialReference));
			 pointGraphic = new esri.Graphic(geometry, pms, attr, activityInfoTemplate);

			//features.push(graphic);
			this.linkedFeatLayer.add(pointGraphic);
		}
	}

//Unselect previous data
ICD.prototype.Clear = function() {
		//we only need to "clear" the ICD if it has been previously initialized
		if (this.svgRoot) {

			//first, unselect all data
			this.SelectData("");
			// this.ShowActivity("");

			//if the parentNode has any children, remove them (this will remove the interactive clock)
			while (this.parentNode.childNodes.length > 0) {
				this.parentNode.removeChild(this.parentNode.childNodes[0]);
			}

			//reset data
			this.activityHeader = [];
			this.activities = [];
			this.activityStyles = [];

			//remove associated map layer

			if (this.linkedFeatLayer) {
				this.linkedFeatLayer.clear();
				this.linkedMap.removeLayer(this.linkedFeatLayer);
				this.linkedFeatLayer = null;
			}


		}
	}