const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// ゲーム状態
let gameState = {
  ball: { x: 400, y: 300, dx: 5, dy: 3 },
  paddle1: { y: 250 }, // 左のパドル
  paddle2: { y: 250 }, // 右のパドル
  score: { player1: 0, player2: 0 },
  gameWidth: 800,
  gameHeight: 600,
  paddleHeight: 100,
  paddleWidth: 10,
  ballSize: 10,
  gameEnded: false,
  winner: null,
  maxScore: 10
};

let players = [];
let gameRunning = false;

// WebSocket接続処理
wss.on('connection', (ws) => {
  console.log('新しいプレイヤーが接続しました');
  
  // プレイヤーを追加
  if (players.length < 2) {
    const playerId = players.length + 1;
    players.push({ ws, id: playerId });
    
    // プレイヤーIDを送信
    ws.send(JSON.stringify({
      type: 'playerAssigned',
      playerId: playerId
    }));
    
    // 初期ゲーム状態を送信
    ws.send(JSON.stringify({
      type: 'gameState',
      state: gameState
    }));
    
    // 2人揃ったらゲーム開始
    if (players.length === 2 && !gameRunning) {
      startGame();
    }
  } else {
    // 観戦者として接続
    ws.send(JSON.stringify({
      type: 'spectator'
    }));
  }
  
  // メッセージ受信処理
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'paddleMove') {
        // パドルの移動
        const player = players.find(p => p.ws === ws);
        if (player && !gameState.gameEnded) {
          if (player.id === 1) {
            gameState.paddle1.y = Math.max(0, Math.min(gameState.gameHeight - gameState.paddleHeight, data.y));
          } else if (player.id === 2) {
            gameState.paddle2.y = Math.max(0, Math.min(gameState.gameHeight - gameState.paddleHeight, data.y));
          }
        }
      } else if (data.type === 'restartGame') {
        // ゲーム再開
        const player = players.find(p => p.ws === ws);
        if (player && gameState.gameEnded) {
          restartGame();
        }
      }
    } catch (error) {
      console.error('メッセージ解析エラー:', error);
    }
  });
  
  // 切断処理
  ws.on('close', () => {
    console.log('プレイヤーが切断しました');
    players = players.filter(p => p.ws !== ws);
    if (players.length < 2) {
      gameRunning = false;
    }
  });
});

// ゲーム開始
function startGame() {
  gameRunning = true;
  console.log('ゲーム開始！');
  
  // ゲームループ
  const gameLoop = setInterval(() => {
    if (!gameRunning || players.length < 2) {
      clearInterval(gameLoop);
      return;
    }
    
    updateGame();
    broadcastGameState();
  }, 1000 / 60); // 60 FPS
}

// ゲーム状態更新
function updateGame() {
  if (gameState.gameEnded) return;
  
  // ボールの移動
  gameState.ball.x += gameState.ball.dx;
  gameState.ball.y += gameState.ball.dy;
  
  // 上下の壁との衝突
  if (gameState.ball.y <= 0 || gameState.ball.y >= gameState.gameHeight - gameState.ballSize) {
    gameState.ball.dy = -gameState.ball.dy;
  }
  
  // パドルとの衝突判定
  // 左のパドル（プレイヤー1）
  if (gameState.ball.x <= gameState.paddleWidth && 
      gameState.ball.y >= gameState.paddle1.y && 
      gameState.ball.y <= gameState.paddle1.y + gameState.paddleHeight) {
    gameState.ball.dx = Math.abs(gameState.ball.dx);
    // ボールの角度を変える
    const hitPos = (gameState.ball.y - gameState.paddle1.y) / gameState.paddleHeight;
    gameState.ball.dy = (hitPos - 0.5) * 10;
  }
  
  // 右のパドル（プレイヤー2）
  if (gameState.ball.x >= gameState.gameWidth - gameState.paddleWidth - gameState.ballSize && 
      gameState.ball.y >= gameState.paddle2.y && 
      gameState.ball.y <= gameState.paddle2.y + gameState.paddleHeight) {
    gameState.ball.dx = -Math.abs(gameState.ball.dx);
    // ボールの角度を変える
    const hitPos = (gameState.ball.y - gameState.paddle2.y) / gameState.paddleHeight;
    gameState.ball.dy = (hitPos - 0.5) * 10;
  }
  
  // 得点判定
  if (gameState.ball.x < 0) {
    // プレイヤー2の得点
    gameState.score.player2++;
    checkGameEnd();
    if (!gameState.gameEnded) {
      resetBall();
    }
  } else if (gameState.ball.x > gameState.gameWidth) {
    // プレイヤー1の得点
    gameState.score.player1++;
    checkGameEnd();
    if (!gameState.gameEnded) {
      resetBall();
    }
  }
}

// ゲーム終了チェック
function checkGameEnd() {
  if (gameState.score.player1 >= gameState.maxScore) {
    gameState.gameEnded = true;
    gameState.winner = 1;
    console.log('プレイヤー1の勝利！');
  } else if (gameState.score.player2 >= gameState.maxScore) {
    gameState.gameEnded = true;
    gameState.winner = 2;
    console.log('プレイヤー2の勝利！');
  }
}

// ゲーム再開
function restartGame() {
  gameState.score.player1 = 0;
  gameState.score.player2 = 0;
  gameState.gameEnded = false;
  gameState.winner = null;
  gameState.paddle1.y = 250;
  gameState.paddle2.y = 250;
  resetBall();
  console.log('ゲームが再開されました');
}

// ボールをリセット
function resetBall() {
  gameState.ball.x = gameState.gameWidth / 2;
  gameState.ball.y = gameState.gameHeight / 2;
  gameState.ball.dx = Math.random() > 0.5 ? 5 : -5;
  gameState.ball.dy = (Math.random() - 0.5) * 6;
}

// 全プレイヤーにゲーム状態を送信
function broadcastGameState() {
  const message = JSON.stringify({
    type: 'gameState',
    state: gameState
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`http://localhost:${PORT} でゲームにアクセスできます`);
});
