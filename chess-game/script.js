
  var board = null;
  var game = new Chess();
  var moveCount = 0;
  var capturedWhite = [];
  var capturedBlack = [];
  var playAgainstBot = false; // Toggle for bot mode

  const pieceSymbols = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
  };

  // Piece values for AI evaluation
  var pieceValue = {
    'p': 10,
    'n': 30,
    'b': 30,
    'r': 50,
    'q': 90,
    'k': 900
  };

  function onDragStart(source, piece, position, orientation) {
    // Don't allow moves if game is over
    if (game.game_over()) return false;

    // Only allow moving pieces for the current turn
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }

    // If playing against bot, only allow white pieces to move
    if (playAgainstBot && piece.search(/^b/) !== -1) {
      return false;
    }
  }

  function onDrop(source, target) {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q'
    });

    // Illegal move
    if (move === null) return 'snapback';

    // Update board position after move
    board.position(game.fen());

    // Track captured pieces
    if (move.captured) {
      if (move.color === 'w') {
        capturedBlack.push(move.captured);
        updateCaptured('black-captured', capturedBlack);
      } else {
        capturedWhite.push(move.captured);
        updateCaptured('white-captured', capturedWhite);
      }
    }

    // Update move history
    addMoveToHistory(move);
    updateStatus();

    // If playing against bot and it's black's turn, make bot move
    if (playAgainstBot && game.turn() === 'b') {
      window.setTimeout(makeBestMove, 250);
    }
  }

  function updateCaptured(elementId, pieces) {
    var html = '';
    pieces.forEach(function(piece) {
      html += pieceSymbols[piece] + ' ';
    });
    document.getElementById(elementId).innerHTML = html;
  }

  function addMoveToHistory(move) {
    moveCount++;
    var historyDiv = document.getElementById('move-history');
    var moveElement = document.createElement('div');
    moveElement.className = 'move-item';
    moveElement.textContent = moveCount + '. ' + move.san;
    historyDiv.appendChild(moveElement);
    historyDiv.scrollTop = historyDiv.scrollHeight;
  }

  function updateStatus() {
    var status = '';
    var moveColor = 'White';
    if (game.turn() === 'b') {
      moveColor = 'Black';
    }

    if (game.in_checkmate()) {
      status = '🏆 Checkmate! ' + moveColor + ' loses!';
    } else if (game.in_draw()) {
      status = '🤝 Draw!';
    } else if (game.in_stalemate()) {
      status = '🤷 Stalemate!';
    } else if (game.in_threefold_repetition()) {
      status = '🔄 Draw by repetition';
    } else {
      status = moveColor + ' to move';
      if (game.in_check()) {
        status = '<span class="check">⚠️ CHECK! ' + moveColor + ' to move</span>';
      }
    }

    document.getElementById('status').innerHTML = status;
  }

  function evaluateBoard() {
    var totalEvaluation = 0;
    var boardState = game.board();
    
    for (var i = 0; i < 8; i++) {
      for (var j = 0; j < 8; j++) {
        if (boardState[i][j] !== null) {
          var piece = boardState[i][j];
          var value = pieceValue[piece.type];
          
          if (piece.color === 'b') {
            totalEvaluation += value;
          } else {
            totalEvaluation -= value;
          }
        }
      }
    }
    
    return totalEvaluation;
  }

  function minimax(depth, isMaximizingPlayer) {
    if (depth === 0) {
      return evaluateBoard();
    }
    
    var moves = game.moves();
    
    if (isMaximizingPlayer) {
      var bestMove = -9999;
      for (var i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        bestMove = Math.max(bestMove, minimax(depth - 1, !isMaximizingPlayer));
        game.undo();
      }
      return bestMove;
    } else {
      var bestMove = 9999;
      for (var i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        bestMove = Math.min(bestMove, minimax(depth - 1, !isMaximizingPlayer));
        game.undo();
      }
      return bestMove;
    }
  }

  function makeBestMove() {
    var moves = game.moves();
    var bestMove = null;
    var bestValue = -9999;
    
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var boardValue = minimax(2, false); // Depth 2 for reasonable speed
      game.undo();
      
      if (boardValue >= bestValue) {
        bestValue = boardValue;
        bestMove = moves[i];
      }
    }
    
    if (bestMove) {
      var move = game.move(bestMove);
      board.position(game.fen());
      
      // Track captured pieces by bot
      if (move.captured) {
        capturedWhite.push(move.captured);
        updateCaptured('white-captured', capturedWhite);
      }
      
      addMoveToHistory(move);
      updateStatus();
    }
  }

  function undoMove() {
    // If playing against bot, undo 2 moves (yours and bot's)
    if (playAgainstBot && moveCount >= 2) {
      game.undo();
      game.undo();
      
      // Remove last 2 moves from history
      var historyDiv = document.getElementById('move-history');
      if (historyDiv.lastChild) historyDiv.removeChild(historyDiv.lastChild);
      if (historyDiv.lastChild) historyDiv.removeChild(historyDiv.lastChild);
      moveCount -= 2;
    } else {
      game.undo();
      
      // Remove last move from history
      var historyDiv = document.getElementById('move-history');
      if (historyDiv.lastChild) {
        historyDiv.removeChild(historyDiv.lastChild);
        moveCount--;
      }
    }
    
    board.position(game.fen());
    recalculateCaptured();
    updateStatus();
  }

  function resetGame() {
    game.reset();
    board.start();
    moveCount = 0;
    capturedWhite = [];
    capturedBlack = [];
    document.getElementById('move-history').innerHTML = '';
    document.getElementById('white-captured').innerHTML = '';
    document.getElementById('black-captured').innerHTML = '';
    updateStatus();
  }

  function toggleBotMode() {
    playAgainstBot = !playAgainstBot;
    var btn = document.getElementById('bot-toggle');
    
    if (playAgainstBot) {
      btn.textContent = '🤖 Bot: ON';
      btn.style.backgroundColor = '#4CAF50';
      document.getElementById('status').innerHTML = 'Playing against AI Bot! You are White';
    } else {
      btn.textContent = '👥 2-Player Mode';
      btn.style.backgroundColor = '#769656';
      updateStatus();
    }
    
    resetGame();
  }

  function recalculateCaptured() {
    capturedWhite = [];
    capturedBlack = [];
    var history = game.history({verbose: true});
    history.forEach(function(move) {
      if (move.captured) {
        if (move.color === 'w') {
          capturedBlack.push(move.captured);
        } else {
          capturedWhite.push(move.captured);
        }
      }
    });
    updateCaptured('white-captured', capturedWhite);
    updateCaptured('black-captured', capturedBlack);
  }

  var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
  };

  board = Chessboard('board', config);

