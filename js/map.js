var map;
var latlng;
var markersArray = [];
var flagsArray = [];
var watchid;
var currentInfoWindow = null;
var Potition_latitude;
var Potition_longitude;
//var Potition_altitude;

// Heatmap呼び出し設定
var HMMapType;
var base_url = "https://globalheat.strava.com/tiles/";
var disp_mode = "both";
var disp_color = "color1";
var disp_opacity = 1;
var select_opacity = "op100";

var base_zoom = 17;
var base_lat = 35.562995;
var base_lng = 139.947754;
var timeout = 10000; // 取得するまでのタイムアウトmsec
var wait = 100000; // 取得する処理が走る時間
var reset_location_msec = 15000; // 繰り返し処理時間

$(function(){
	// 位置取得開始ボタン処理
	$('#arrow_start').on('click',function(){
		setNowLocation();
	  $('#arrow_stop').css({'display':'inline-block'});
	  $('#arrow_start').css({'display':'none'});
	});

	// 位置取得停止ボタン処理
	$('#arrow_stop').on('click',function(){
		LocationStop();
	});

	// menuボタン処理
	$('#menu').on('click',function(){
		$("#menu_area").slideDown();
	});
	$('#menu_close').on('click',function(){
		$("#menu_area").slideUp();
	});

	// 透明度変更
	$('.change_op').on('click',function(){
		$('.change_op').removeClass('selected');
		$(this).addClass('selected');
		var selectOp = this.id.toString();
		var setOp = 1;
		setOp = Number(selectOp.substr(2))/100;
		disp_opacity = setOp;
		HMMapType.setOpacity(disp_opacity);
		dispHeatMap("reset");
		Cookies.set('opc', disp_opacity, { expires: 90 });
	});

	// 色変更
	$('.change_color').on('click',function(){
		$('.change_color').removeClass('selected');
		$(this).addClass('selected');
		var selectColor = this.id.toString();
		disp_color = selectColor;
		setHeatMap(disp_mode,selectColor,disp_opacity);
		dispHeatMap("reset");
		Cookies.set('clr', disp_color, { expires: 90 });
	});

//	// 表示モード変更
//	$('.change_mode').on('click',function(){
//		var selectMode = this.id.toString();
//		disp_mode = selectMode;
//		setHeatMap(selectMode,disp_color,disp_opacity);
//		dispHeatMap("reset");
//	});

	$('#pac-input').keyup(function() {
			if(document.getElementById("pac-input").value != ""){
				$('#search-reset-btn').css({'display':'inline-block'});
			}

	});

});

function initMap() {

	// cookieから設定値読み込み
	if(Cookies.get('clr')){
		disp_color = Cookies.get('clr');
	}
	if(Cookies.get('opc')){
		disp_opacity = Cookies.get('opc');
		select_opacity = 'op'+parseInt(parseFloat(disp_opacity)*100);
	}

	// 初期選択の表示
	$('#'+disp_color).addClass('selected');
	$('#'+select_opacity).addClass('selected');

	// Option
	var opts = {
	  zoom: base_zoom,
	  center: new google.maps.LatLng(base_lat,base_lng),
		mapTypeId: 'roadmap',
		disableDefaultUI:true,
		clickableIcons: false,
	};

	// 地図スタイル設定
  var stylesArray = [
      {
          stylers: [
              {saturation:-60}
          ]
      }
  ];

	// Create instance
	map = new google.maps.Map(document.getElementById('map'),opts);

	// 地図スタイルセット
	map.setOptions({styles: stylesArray});

	// HeatMap設定セット
	setHeatMap(disp_mode, disp_color,disp_opacity);

	// 現在位置取得の開始
	setNowLocation();

	// Heatmap表示
	dispHeatMap();

	//// Listener ////
	// 拡大率制御
	map.addListener('zoom_changed', limitZoom);

	//// Search Box ////
  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old flags.
    flagsArray.forEach(function(marker) {
      marker.setMap(null);
    });
    flagsArray = [];

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }
      var icon = {
        url: "./img/flag.png",
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(50, 100),
        scaledSize: new google.maps.Size(150, 150)
      };

      // Create a marker for each place.
			// フラッグ設定
			var flag_marker = new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
				clickable: true,
				animation: google.maps.Animation.DROP,
        position: place.geometry.location
      });
			// クリック時リスナー設定
			//google.maps.event.addListener(flag_marker, 'click', FlagClickEventFunc);
	    google.maps.event.addListener(flag_marker, 'click', function(flag_marker){
				// 情報ウインドウ表示
				var infowindow = new google.maps.InfoWindow({
					content: '<span class="info_win">'+this.title+'</span>'
				});
				// open中のウインドウをclose
				if (currentInfoWindow) {
					currentInfoWindow.close();
				}
				// ウインドウをopen
				infowindow.open(map, this);
				currentInfoWindow = infowindow;
			});

			// フラッグを配列にセット
      flagsArray.push(flag_marker);

//      if (place.geometry.viewport) {
//        // Only geocodes have viewport.
//        bounds.union(place.geometry.viewport);
//      } else {
        bounds.extend(place.geometry.location);
        bounds.extend(latlng); // ADD
//      }
    });
    map.fitBounds(bounds);
		// 現在位置取得非活性
		LocationStop();

  });

}


// 現在位置取得非活性
function LocationStop(){
	stopNowLocation();
  $('#arrow_stop').css({'display':'none'});
  $('#arrow_start').css({'display':'inline-block'});
}

// HeatMap設定セット
function setHeatMap(disp_mode, disp_color,disp_opacity){
	// キャッシュ対策
	//var date = new Date();
	//var unixTimestamp = date.getTime();

	// ヒートマップ画像呼び出し設定
	HMMapType = new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			//return base_url+disp_mode+"/"+disp_color+"/"+zoom+"/"+coord.x+"/"+coord.y+".png?"+unixTimestamp;
			return base_url+disp_mode+"/"+disp_color+"/"+zoom+"/"+coord.x+"/"+coord.y+".png";
		},
		tileSize: new google.maps.Size(256, 256),
		maxZoom: 17,
		minZoom: 0,
		isPng: true,
		name: 'HM',
		opacity: parseFloat(disp_opacity)
	});
}
// Heatmap表示
function dispHeatMap(param){
	if(param == "reset"){
		map.overlayMapTypes.removeAt(0);
	}
	map.overlayMapTypes.insertAt(0, HMMapType);
}

// 拡大率の制御
function limitZoom(){
	var now_zoom = map.getZoom();
	if(now_zoom>17){
		var result = map.setZoom(17);
	}
}

// マーカーの配列を空にする
function clearMarkersArray(){
	if (markersArray) {
		for (i in markersArray) {
			markersArray[i].setMap(null);
		}
			markersArray.length = 0;
	}
}

// 目的地フラッグの配列を空にする
function clearFlagsArray(){
	if (flagsArray) {
		for (i in flagsArray) {
			flagsArray[i].setMap(null);
		}
			flagsArray.length = 0;
	}
}

// 現在位置取得の停止
function stopNowLocation(){

	if (navigator.geolocation) {
		navigator.geolocation.clearWatch( watchid ); // 位置取得停止
		clearMarkersArray(); // マーカーを削除

		// 非活性表示マーカーを配置
		// マーカー設定
		var markerImage = {
			url: "./img/marker_die.png",
			scaledSize: new google.maps.Size(100, 100),
		}
		var markerOptions = {
			position: latlng,
			icon: markerImage,
			optimized: false,
			clickable: false,
			draggable: false,
		};
		// マーカーの配列を空にする
		clearMarkersArray();
		// マーカーを配列に格納する
		var marker = new google.maps.Marker(markerOptions);
		markersArray.push(marker);

		// マーカーの配列を表示する
		if (markersArray) {
			for (i in markersArray) {
				markersArray[i].setMap(map);
			}
		}

	}
}

// 現在位置の取得
function setNowLocation(){
	var option = {
		enableHighAccuracy: true,
		timeout : timeout,
		maximumAge: 0
	};
	if (navigator.geolocation) {
		// 1回だけ取得
		//watchid = navigator.geolocation.getCurrentPosition(successCallback,errorCallback,option);

		// 変更がある度に取得
		watchid = navigator.geolocation.watchPosition(successCallback,errorCallback,option);
		setTimeout( function(){ navigator.geolocation.clearWatch( watchid ); },wait);

	}else {
		alert("このブラウザはサポート外です");
	};
}

// 現在位置の取得(成功時処理)
function successCallback(pos) {
	Potition_latitude = pos.coords.latitude;
	Potition_longitude = pos.coords.longitude;
	//Potition_altitude = pos.coords.altitude;
	// 緯度経度セット
	if(Potition_latitude && Potition_longitude){
		//console.log(Potition_latitude+" "+Potition_longitude);
		// set now location
		latlng = new google.maps.LatLng(Potition_latitude, Potition_longitude);
		map.setCenter(latlng);

		// マーカー設定
		var markerImage = {
			url: "./img/marker.png",
			scaledSize: new google.maps.Size(100, 100),
		}
		var markerOptions = {
			position: latlng,
			icon: markerImage,
			optimized: false,
			clickable: false,
			draggable: false,
		};
		// マーカーの配列を空にする
		clearMarkersArray();
		// マーカーを配列に格納する
		var marker = new google.maps.Marker(markerOptions);
		markersArray.push(marker);

		// マーカーの配列を表示する
		if (markersArray) {
			for (i in markersArray) {
				markersArray[i].setMap(map);
			}
		}

		// Re-Set Location
		// reset_location_msecごとに現在位置取得
		//setTimeout(setNowLocation(),reset_location_msec);
		//setInterval(setNowLocation(),reset_location_msec);

	}

//	// 高度セット
//	if(Potition_altitude){
//		// TODO
//	}

	// 位置取得停止ボタン表示
  $('#arrow_stop').css({'display':'inline-block'});
  $('#arrow_start').css({'display':'none'});

}

// 現在位置の取得(失敗時処理)
function errorCallback(err) {
    alert("位置情報が取得できませんでした");
};

// 検索BOXクリアボタン押下
function ClearButton_Click(){
	// 入力欄クリア
	document.getElementById("pac-input").value = "";
  $('#search-reset-btn').css({'display':'none'});
	// 目的地フラッグ除去
	clearFlagsArray();

}

