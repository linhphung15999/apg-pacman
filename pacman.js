const {sync:activeWindow} = require('active-win');


var cp = require('child_process').spawn('Pacman.exe');
var ks = require('node-key-sender');

const fs = require('fs');
const path = require('path');





function empty_dir(directory){
	fs.readdir(directory, (err, files) => {
	  if (err) throw err;

	  for (const file of files) {
		fs.unlink(path.join(directory, file), err => {
		  if (err) throw err;
		});
	  }
	});
}



var chokidar = require('chokidar')

var cmd_idx = 0;
empty_dir("./cmd");

function get_line(filename, line_no, callback) {
    var data = fs.readFileSync(filename, 'utf8');
    var lines = data.split("\n");
 
    if(+line_no > lines.length){
      throw new Error('File end reached without finding line');
    }
 
    callback(null, lines[+line_no]);
}
 





console.log(cp.pid);

cp.on('exit', function (code) {
  console.log('The game is terminated.');
  process.exit(0);
});

var firebase = require("firebase-admin");
var serviceAccount = require(".\\key.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://pacman-3f131-default-rtdb.asia-southeast1.firebasedatabase.app"
});

//==============================================

//==============================================

command_list = ['super pellet','scare ghosts','ignore ghosts','freeze ghosts','remove 2 pellets','slow down','one more ghost','hide super pellets'];
var button_states = [true,true,true,true,true,true,true,true]

var db = firebase.database();
var initial = 0;
var key2send = 'space';

db.ref('/commands').remove();
db.ref('/leaderboard').remove();
db.ref('/commands-list').once("value", function(snapshot) {
  snapshot.forEach(function(child) {
    child.ref.update({
      available: true
    });
  });
});
db.ref('/currentscore').update({isplaying:true, score:0, available:true});

process.on('exit',function (){console.log("Exiting"); db.ref('/currentscore').update({available:false,score:0});});
process.on('SIGINT', function (){console.log("Exiting"); db.ref('/currentscore').update({available:false,score:0}); process.exit(2);});

var current_keys = [];
var new_keys = [];
var keys = [];
var vals = null;
var game_end = 0;
var leaderboard = {};

var watcher = chokidar.watch('')
watcher.on('add', function(path) {
    if (path == 'finish.txt'){
        console.log('The game has finished, press escape key to quit the highscore table in 3 secs')
		get_line('score.txt', 0, function(err, line){
			console.log('Score: ' + line);
			db.ref('/highscore').push({'score':line});
			db.ref('/currentscore').update({'isplaying':false, 'score':line});
		})
		db.ref('/commands-list').once("value", function(snapshot) {
		  snapshot.forEach(function(child) {
			child.ref.update({
			  available: true
			});
		  });
		});
		
		game_end = 1;
        setTimeout(function(){/* ks.sendKey("escape"); */
		
			db.ref('/commands').remove();

			current_keys = [];
			new_keys = [];
			keys = [];
			vals = null;

			leaderboard = {};
			game_end = 0; 
			db.ref('/currentscore').update({isplaying:true, score:0});
		
		}, 9000)
		fs.unlink(path, () => {
			console.log('finish.txt file has been deleted')
		})
    }
})

let reset_score = true
if (reset_score){
	fs.closeSync(fs.openSync('reset.txt', 'w'))
}

db.ref('/commands/').on('value',(snapshot)=>{
	vals = snapshot.val();
	if (vals != null){
		keys = Object.keys(vals);
	}
	//=======================================
});

/* 
#move: 
	up:0
	down:1
	left:2
	right:3

#bonus: */


function parseKey(id){
	switch(id){
		case '1':
			return '3';
			break;
		case '2':
			return '4';
			break;
		case '3':
			return '5';
			break;
		case '4':
			return 'V';
			break;
		case '5':
			return '0';
			break;
		case '6':
			return '6';
			break;
		case '7':
			return 'N';
			break;
		case '8':
			return '7';
			break;
	}
}

function changeBtnState(cmdid,state){
	if (state=='true'){
		db.ref('/commands-list').child(cmdid).update({available:true});
	}else{
		db.ref('/commands-list').child(cmdid).update({available:false});
	}
}
	
function gameControl(mvp_cmd,mvp_aud){
	if (game_end==1){console.log('The game is ended.');} else{
	if (button_states[mvp_cmd-1]){
		key2send = parseKey(mvp_cmd)
		
		fs.writeFileSync('./cmd/'+cmd_idx, key2send);
		cmd_idx = cmd_idx+1;
		
		button_states[mvp_cmd-1] = false;
		changeBtnState('cmd'+mvp_cmd,false);
		setTimeout(function (){
			db.ref('/commands-list').child('cmd'+mvp_cmd).update({available:true});
			button_states[mvp_cmd-1] = true;
		},5000);
		
		console.log('Key '+key2send+' sent by '+mvp_aud+'.');
		
		sender = "Ms Pacman";
		message = "["+mvp_aud+"] "+command_list[mvp_cmd-1];
		var today = new Date();

		function time(today) {
		  str = today.toISOString().replace("T",", ").replaceAll("-","/").replace(/\..+/, '');
		  return str.substring(str.indexOf(' ') + 1);
		}

		function day(today){
			var dd = String(today.getUTCDate()).padStart(2, '0');
			var mm = String(today.getUTCMonth() + 1).padStart(2, '0');
			var yyyy = today.getUTCFullYear();
			return mm+"/"+dd+"/"+yyyy;
		}

		timestamp = day(today)+" "+time(today);
		
		data = {"message":message,"sender":sender,"timestamp":timestamp};
		
		
		db.ref('/chats').push(data);
		
		if (leaderboard[mvp_aud]==null){
			leaderboard[mvp_aud] = 1;
		} else{
			leaderboard[mvp_aud] += 1;
		}
		
		data_lb = {};
		data_lb['user']=mvp_aud;
		data_lb['score'] = leaderboard[mvp_aud];
		
		dt = {};
		
		dt[mvp_aud] = data_lb;
		
		db.ref('/leaderboard').update(dt); 
		//db.ref('/leaderboard-temp').push({'user':mvp_aud,'score':leaderboard[mvp_aud]});
		
	}
	else{
		console.log("Command can't be sent");
	}}
}


function handelCommands(vals,new_keys){
	flag = new Array(new_keys.length).fill(0);
	mvp_cmd_count = 0;
	mvp_cmd = "";
	mvp_aud = "";
	auds = [];
	for (let i=0;i<new_keys.length;i++){
		if (flag[i]==0){
			tmp_auds = [vals[new_keys[i]]['sender']];
			count = 1;
			flag[i]=1;
			for (let j=i+1;j<new_keys.length;j++){
				if (flag[j]==0 && vals[new_keys[j]]['id']==vals[new_keys[i]]['id']){
					count+=1; flag[j]=1
					tmp_auds.push(vals[new_keys[j]]['sender']);
				}
			}
			if (count>mvp_cmd_count){
				mvp_cmd_count = count;
				mvp_cmd = vals[new_keys[i]]['id'];
				auds = tmp_auds;
			}
		}
	}
	
	flag = new Array(auds.length).fill(0);
	mvp_c = 0;
	for (let i=0;i<auds.length;i++){
		if (flag[i]==0){
			flag[i]=1;
			c = 1;
			for (let j=i+1;j<auds.length;j++){
				if(flag[j]==0 && auds[j]==auds[i]){
					flag[j]=1;
					c = c+1;
				}
			}
			if (c>mvp_c){
				mvp_c = c;
				mvp_aud = auds[i];
			}
		}
	}
	//console.log(auds[0]+"");
	//console.log("Most voted command id: "+mvp_cmd+" ("+mvp_cmd_count+" times), "+mvp_aud+" "+mvp_c+" times.\n");
	return [mvp_cmd,mvp_aud];
}

var interval = setInterval(function() {
	if (keys!=null){
	
		var new_keys = keys.filter(x => !current_keys.includes(x));
		
		if(new_keys.length>0){
			res = handelCommands(vals,new_keys);
			mvp_cmd = res[0];
			mvp_aud = res[1];
			gameControl(mvp_cmd,mvp_aud);
		}
				
		new_keys.forEach(e => db.ref('/commands').child(e).remove());
		
		current_keys = current_keys+new_keys;
		
		if (current_keys.length>500){
			current_keys = current_keys.slice(Math.max(current_keys.length - 500, 0));
		}
	}
	
	get_line('score.txt', 0, function(err, line){
			db.ref('/currentscore').update({'score':line});
	})
	
}, 1000);
