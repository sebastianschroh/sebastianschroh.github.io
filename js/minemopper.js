"use strict";

const DIFFICULTIES = [
{
  difficulty: "EASY",
  row: 8,
  col: 10,
  
  mines: 10
},
{
 difficulty: "MEDIUM",
 row: 14,
 col: 18,
 mines: 40
},
{
  difficulty: "HARD",
  row: 20,
  col: 24,
  mines: 99
}

];

// Global Variables
var _touchTimer;
var _longTouchDuration = 1000; //ms


window.addEventListener('load', main);


/**
 * Code to absorb events for long presses on mobile
 * source: https://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android/28748222
 * @param {*} event 
 */
function absorbEvent_(event) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;

}
function preventLongPressMenu(node) {
  node.ontouchstart = absorbEvent_;
  node.ontouchmove = absorbEvent_;
  node.ontouchend = absorbEvent_;
  node.ontouchcancel = absorbEvent_;
}

/** event handlers */

function menuButtonHandler (menuButton, index, game) {
  let difficulty = DIFFICULTIES[index];
  $(menuButton).text(difficulty.difficulty);
  $(menuButton).on('click', function(){
      game.init(difficulty.row, difficulty.col, difficulty.mines);
      render(game);
      $('.mineCount').text(difficulty.mines);
  });
}

function mouseDownHandler (event, game, row , col) {
  if(event.buttons == 1) // left-click
  {
    game.uncover(row, col);
    render(game);
  }
  else if(event.buttons == 2) // right-click
  {
    game.mark(row, col);
    render(game);
  }
};

function render(game) {
  const grid = document.querySelector(".grid");
  grid.style.gridTemplateColumns = `repeat(${game.ncols}, 1fr)`;
  const rendering = game.getRendering();

  for( let i = 0 ; i < grid.children.length ; i ++) {
    const card = grid.children[i];
    const ind = Number(card.getAttribute("data-cardInd"));
    const col = Math.floor(i%game.ncols);
    const row = Math.floor(i/game.ncols);
    if( ind >= game.ncols * game.nrows) {
      card.style.display = "none";
    }
    else {
      card.style.display = "block";
      let currentState = rendering[row].charAt(col);
      if(currentState == "F") {
        card.classList.add("flagged");
      }
      else if(currentState == "H") {
        card.className = 'card';
      }
      else if(currentState == "M") {
        card.classList.add("uncovered");
        card.classList.add("mine");
      }
      else {
        card.classList.add("uncovered");
        switch(currentState) {
          case '0':
            break;
          case '1':
            card.classList.add("oneMine");
            break;
          case '2':
            card.classList.add('twoMine');
            break;
          case '3':
            card.classList.add('threeMine');
          case '4':
            card.classList.add('fourMine');
            break;
          case '5':
            card.classList.add('fiveMine');
            break;
          case '6':
            card.classList.add('sixMine');
            break;
          case '7':
            card.classList.add('sevenMine');
            break;
          case '8':
            card.classList.add('eightMine');
            break;
          }
      }

    }
  }

};

function prepare_dom(game) {
  const nCards = 24 * 20; // max grid size
  for( let i = 0 ; i < nCards ; i ++) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-cardInd", i);
    card.oncontextmenu = function(){return false;}
    //preventLongPressMenu(card);

    card.addEventListener("touchstart", ()=> {
      alert('yeet');
        _touchTimer = setTimeout(game.mark(i), _longTouchDuration);
    });

    card.addEventListener("touchend", () => {
      if(_touchTimer) {
        clearTimeout(_touchTimer);
        game.uncover(i);
      }
    });

    card.addEventListener("mousedown", (event) => {
        mouseDownHandler(event, game, i);
      });
    
    $('.grid').append(card);
  }
}

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  
   function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(i) {
      let col = Math.floor(i%this.ncols);
      let row = Math.floor(i/this.ncols);
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(i) {
      let col = Math.floor(i%this.ncols);
      let row = Math.floor(i/this.ncols);
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();

function main() {
    let game = new MSGame();
    let defaultDifficulty = DIFFICULTIES[0]; //easy
    game.init(defaultDifficulty.row, defaultDifficulty.col, defaultDifficulty.mines);

    $('.menuButton').each(function(index){
      menuButtonHandler(this, index, game);
    });

    $('.mineCount').text(defaultDifficulty.mines);
    prepare_dom(game);
    render(game);
}
