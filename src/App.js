import React from 'react';
import './App.css';
import Dropzone from 'react-dropzone'

const campfireStory = "With Or Without You.mp3";
const bootingUp = "Who'll Stop The Rain.mp3";
var db;

function getTime(time) {
  if (!isNaN(time)) {
    return (
      Math.floor(time / 60) + ":" + ("0" + Math.floor(time % 60)).slice(-2)
    );
  }
}

function playSound(arraybuffer) {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var context = new window.AudioContext();
  var source;
  context.decodeAudioData(arraybuffer, function (buf) {
    source = context.createBufferSource();
    source.connect(context.destination);
    source.buffer = buf;
    source.start(0);
  });
}

function initDB() {
  if (!('indexedDB' in window)) {
    console.log('This browser doesn\'t support IndexedDB');
    return;
  }
    
  var request = indexedDB.open("MyTestDatabase");
  request.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request.onsuccess = function(event) {
    db = event.target.result;
  };
  request.onupgradeneeded = function(event) { 
    var db = event.target.result;
    alert('running onupgradeneeded');
    if (!db.objectStoreNames.contains('store')) {
      var storeOS = db.createObjectStore('store', {keyPath: 'name'});
    }
  };
}

function arrayBufferToBlob(buffer, type) {
  return new Blob([buffer], {type: type});
}

function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      resolve(reader.result);
    });
    reader.addEventListener('error', reject);
    reader.readAsArrayBuffer(blob);
  });
}

class App extends React.Component {    
  state = {
    selectedTrack: null,
    player: "stopped",
    currentTime: null,
    duration: null
  };

  componentDidMount() {
    this.player.addEventListener("timeupdate", e => {
      this.setState({
        currentTime: e.target.currentTime,
        duration: e.target.duration
      });
    });

    initDB();
  }

  componentWillUnmount() {
    this.player.removeEventListener("timeupdate", () => {});
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.selectedTrack !== prevState.selectedTrack) {
      let track;
      switch (this.state.selectedTrack) {
        case "Campfire Story":
          track = campfireStory;
          break;
        case "Booting Up":
          track = bootingUp;
          break;
        default:
          break;
      }
      if (track) {
        this.player.src = track;
        this.player.play();
        this.setState({ player: "playing", duration: this.player.duration });
      }
    }
    if (this.state.player !== prevState.player) {
      if (this.state.player === "paused") {
        this.player.pause();
      } else if (this.state.player === "stopped") {
        this.player.pause();
        this.player.currentTime = 0;
        this.setState({ selectedTrack: null });
      } else if (
        this.state.player === "playing" &&
        prevState.player === "paused"
      ) {
        this.player.play();
      }
    }
  }

  onDrop = (acceptedFiles) => {
    console.log(acceptedFiles);
    var reader = new FileReader();
    /*
    reader.onload = () => {
      // Do whatever you want with the file contents
      const binaryStr = reader.result
      console.log(binaryStr)
    }
    acceptedFiles.forEach(acceptedFiles => reader.readAsBinaryString(acceptedFiles))
    */

    reader.onload = function (e) {
        console.log(e.target.result);
        //playSound(e.target.result);
    }
    //acceptedFiles.forEach(acceptedFiles => reader.readAsArrayBuffer(acceptedFiles))
    var acceptedFile = acceptedFiles[0]
    reader.readAsArrayBuffer(acceptedFile)
    
    // save file to indexedDB
    // objectStore add() vs put() [updates existing record]
    db.transaction(["store"], "readwrite").objectStore("store").put(arrayBufferToBlob(acceptedFile)).onsuccess = function(event) {
      console.log("save to db success");
    };
    
    var soundFile;
    // get file from indexedDB and store as var
    db.transaction("store").objectStore("store").get("Who'll Stop The Rain.mp3").onsuccess = function(event) {
      alert("Name for Who'll Stop The Rain.mp3 is " + event.target.result.name);
      
      // what type is soundFile when retrieved from db?
      soundFile = event.target.result;
    };
    
    
    playSound(blobToArrayBuffer(soundFile));
  }
  
  render() {
    const list = [
      { id: 1, title: "Campfire Story" },
      { id: 2, title: "Booting Up" }
    ].map(item => {
      return (
        <li
          key={item.id}
          onClick={() => this.setState({ selectedTrack: item.title })}
        >
          {item.title}
        </li>
      );
    });

    const currentTime = getTime(this.state.currentTime);
    const duration = getTime(this.state.duration);

    return (
      <>
        <h1>My Little Player</h1>
        <ul>{list}</ul>
        <div>
          {this.state.player === "paused" && (
            <button onClick={() => this.setState({ player: "playing" })}>
              Play
            </button>
          )}
          {this.state.player === "playing" && (
            <button onClick={() => this.setState({ player: "paused" })}>
              Pause
            </button>
          )}
          {this.state.player === "playing" || this.state.player === "paused" ? (
            <button onClick={() => this.setState({ player: "stopped" })}>
              Stop
            </button>
          ) : (
            ""
          )}
        </div>
        {this.state.player === "playing" || this.state.player === "paused" ? (
          <div>
            {currentTime} / {duration}
          </div>
        ) : (
          ""
        )}
        
        <audio ref={ref => (this.player = ref)} />
        
        // TODO: add accept=, maxSize= props
        <Dropzone onDrop={this.onDrop}>
          {({getRootProps, getInputProps, isDragActive}) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive ? "Drop it like it's hot!" : 'Click me or drag a file to upload!'}
            </div>
          )}
        </Dropzone>
       
      </>
    );
  }
}

export default App;
