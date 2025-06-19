// ゲーム設定
const GAME_CONFIG = {
    TILE_SIZE: 32,
    MAP_WIDTH: 20,
    MAP_HEIGHT: 20,
    CANVAS_WIDTH: 640,
    CANVAS_HEIGHT: 640
};

// タイルタイプ
const TILE_TYPES = {
    WALL: 0,
    FLOOR: 1,
    STAIRS: 2,
    DOOR: 3
};

// エンティティタイプ
const ENTITY_TYPES = {
    PLAYER: 'player',
    ENEMY: 'enemy',
    ITEM: 'item'
};

// ゲームクラス
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentFloor = 1;
        this.gameMap = null;
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.messages = [];
        this.turnCount = 0;
        
        this.init();
    }
    
    init() {
        this.generateFloor();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    generateFloor() {
        this.gameMap = new GameMap(GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);
        this.gameMap.generate();
        
        // プレイヤーを配置
        const startRoom = this.gameMap.rooms[0];
        if (!this.player) {
            this.player = new Player(
                startRoom.x + Math.floor(startRoom.width / 2),
                startRoom.y + Math.floor(startRoom.height / 2)
            );
        } else {
            this.player.x = startRoom.x + Math.floor(startRoom.width / 2);
            this.player.y = startRoom.y + Math.floor(startRoom.height / 2);
        }
        
        // 敵を配置
        this.enemies = [];
        for (let i = 1; i < this.gameMap.rooms.length; i++) {
            const room = this.gameMap.rooms[i];
            if (Math.random() < 0.7) { // 70%の確率で敵を配置
                const enemy = new Enemy(
                    room.x + Math.floor(Math.random() * room.width),
                    room.y + Math.floor(Math.random() * room.height),
                    this.getEnemyType()
                );
                this.enemies.push(enemy);
            }
        }
        
        // アイテムを配置
        this.items = [];
        for (let i = 0; i < 5 + this.currentFloor; i++) {
            const room = this.gameMap.rooms[Math.floor(Math.random() * this.gameMap.rooms.length)];
            const item = new Item(
                room.x + Math.floor(Math.random() * room.width),
                room.y + Math.floor(Math.random() * room.height),
                this.getRandomItemType()
            );
            this.items.push(item);
        }
        
        this.addMessage(`${this.currentFloor}階に到着しました`, 'level');
    }
    
    getEnemyType() {
        const types = ['スライム', 'ゴブリン', 'オーク', 'スケルトン'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getRandomItemType() {
        const types = ['ポーション', 'パン', 'おにぎり', 'お金'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleInput(e.key);
        });
    }
    
    handleInput(key) {
        let dx = 0, dy = 0;
        let action = null;
        
        switch(key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                dy = -1;
                break;
            case 's':
            case 'arrowdown':
                dy = 1;
                break;
            case 'a':
            case 'arrowleft':
                dx = -1;
                break;
            case 'd':
            case 'arrowright':
                dx = 1;
                break;
            case 'enter':
                action = 'stairs';
                break;
            case ' ':
                action = 'pickup';
                break;
            case 'z':
                action = 'wait';
                break;
        }
        
        if (dx !== 0 || dy !== 0) {
            this.movePlayer(dx, dy);
        } else if (action) {
            this.handleAction(action);
        }
    }
    
    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // 境界チェック
        if (newX < 0 || newX >= GAME_CONFIG.MAP_WIDTH || 
            newY < 0 || newY >= GAME_CONFIG.MAP_HEIGHT) {
            return;
        }
        
        // 壁チェック
        if (this.gameMap.tiles[newY][newX] === TILE_TYPES.WALL) {
            return;
        }
        
        // 敵との戦闘チェック
        const enemy = this.enemies.find(e => e.x === newX && e.y === newY && e.alive);
        if (enemy) {
            this.combat(this.player, enemy);
            this.processTurn();
            return;
        }
        
        // 移動実行
        this.player.x = newX;
        this.player.y = newY;
        this.processTurn();
    }
    
    handleAction(action) {
        switch(action) {
            case 'stairs':
                if (this.gameMap.tiles[this.player.y][this.player.x] === TILE_TYPES.STAIRS) {
                    this.currentFloor++;
                    this.generateFloor();
                    this.updateUI();
                }
                break;
            case 'pickup':
                const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
                if (item) {
                    this.pickupItem(item);
                }
                break;
            case 'wait':
                this.processTurn();
                break;
        }
    }
    
    combat(attacker, defender) {
        const damage = Math.max(1, attacker.attack - defender.defense + Math.floor(Math.random() * 5) - 2);
        defender.hp -= damage;
        
        if (attacker === this.player) {
            this.addMessage(`${defender.name}に${damage}のダメージ！`, 'combat');
            if (defender.hp <= 0) {
                defender.alive = false;
                const exp = defender.expValue || 10;
                this.player.gainExp(exp);
                this.addMessage(`${defender.name}を倒した！ ${exp}EXP獲得`, 'combat');
            }
        } else {
            this.addMessage(`${attacker.name}から${damage}のダメージを受けた！`, 'combat');
            if (defender.hp <= 0) {
                this.addMessage('ゲームオーバー！', 'combat');
                // ゲームオーバー処理
            }
        }
    }
    
    pickupItem(item) {
        switch(item.type) {
            case 'ポーション':
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
                this.addMessage('ポーションを使用してHPが回復した！', 'item');
                break;
            case 'パン':
            case 'おにぎり':
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
                this.addMessage(`${item.type}を食べてHPが少し回復した！`, 'item');
                break;
            case 'お金':
                const gold = 10 + Math.floor(Math.random() * 20);
                this.player.gold += gold;
                this.addMessage(`${gold}Gを拾った！`, 'item');
                break;
        }
        
        // アイテムを削除
        this.items = this.items.filter(i => i !== item);
        this.updateUI();
    }
    
    processTurn() {
        this.turnCount++;
        
        // 敵のAI処理
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            // プレイヤーとの距離を計算
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.abs(dx) + Math.abs(dy);
            
            if (distance === 1) {
                // 隣接している場合は攻撃
                this.combat(enemy, this.player);
            } else if (distance <= 5) {
                // 5マス以内の場合は追跡
                const moveX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
                const moveY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
                
                const newX = enemy.x + (Math.abs(dx) > Math.abs(dy) ? moveX : 0);
                const newY = enemy.y + (Math.abs(dx) <= Math.abs(dy) ? moveY : 0);
                
                // 移動可能かチェック
                if (newX >= 0 && newX < GAME_CONFIG.MAP_WIDTH &&
                    newY >= 0 && newY < GAME_CONFIG.MAP_HEIGHT &&
                    this.gameMap.tiles[newY][newX] !== TILE_TYPES.WALL &&
                    !this.enemies.some(e => e.x === newX && e.y === newY && e.alive)) {
                    enemy.x = newX;
                    enemy.y = newY;
                }
            }
        });
        
        this.updateUI();
    }
    
    addMessage(text, type = '') {
        this.messages.push({ text, type, turn: this.turnCount });
        if (this.messages.length > 50) {
            this.messages.shift();
        }
        
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = `[${this.turnCount}] ${text}`;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    updateUI() {
        document.getElementById('playerLevel').textContent = this.player.level;
        document.getElementById('currentFloor').textContent = `${this.currentFloor}F`;
        document.getElementById('playerHp').textContent = this.player.hp;
        document.getElementById('playerMaxHp').textContent = this.player.maxHp;
        document.getElementById('playerExp').textContent = this.player.exp;
        document.getElementById('playerExpNext').textContent = this.player.expToNext;
        document.getElementById('playerAttack').textContent = this.player.attack;
        document.getElementById('playerDefense').textContent = this.player.defense;
        document.getElementById('playerGold').textContent = this.player.gold;
        
        // HPバー更新
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('hpBar').style.width = `${hpPercent}%`;
        
        // 経験値バー更新
        const expPercent = (this.player.exp / this.player.expToNext) * 100;
        document.getElementById('expBar').style.width = `${expPercent}%`;
    }
    
    gameLoop() {
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    render() {
        // 画面クリア
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // マップ描画
        this.gameMap.render(this.ctx);
        
        // アイテム描画
        this.items.forEach(item => item.render(this.ctx));
        
        // 敵描画
        this.enemies.forEach(enemy => {
            if (enemy.alive) enemy.render(this.ctx);
        });
        
        // プレイヤー描画
        this.player.render(this.ctx);
    }
}

// マップ生成クラス
class GameMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.rooms = [];
    }
    
    generate() {
        // マップを壁で初期化
        this.tiles = Array(this.height).fill().map(() => Array(this.width).fill(TILE_TYPES.WALL));
        
        // 部屋を生成
        this.generateRooms();
        
        // 部屋を繋ぐ
        this.connectRooms();
        
        // 階段を配置
        this.placeStairs();
    }
    
    generateRooms() {
        const maxRooms = 8;
        const minRoomSize = 4;
        const maxRoomSize = 8;
        
        for (let i = 0; i < maxRooms; i++) {
            const width = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
            const height = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
            const x = Math.floor(Math.random() * (this.width - width - 1)) + 1;
            const y = Math.floor(Math.random() * (this.height - height - 1)) + 1;
            
            const newRoom = { x, y, width, height };
            
            // 他の部屋と重複していないかチェック
            let overlaps = false;
            for (const room of this.rooms) {
                if (this.roomsOverlap(newRoom, room)) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                this.createRoom(newRoom);
                this.rooms.push(newRoom);
            }
        }
    }
    
    roomsOverlap(room1, room2) {
        return room1.x < room2.x + room2.width + 1 &&
               room1.x + room1.width + 1 > room2.x &&
               room1.y < room2.y + room2.height + 1 &&
               room1.y + room1.height + 1 > room2.y;
    }
    
    createRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.tiles[y][x] = TILE_TYPES.FLOOR;
            }
        }
    }
    
    connectRooms() {
        for (let i = 1; i < this.rooms.length; i++) {
            const prevRoom = this.rooms[i - 1];
            const currentRoom = this.rooms[i];
            
            const prevCenter = {
                x: prevRoom.x + Math.floor(prevRoom.width / 2),
                y: prevRoom.y + Math.floor(prevRoom.height / 2)
            };
            
            const currentCenter = {
                x: currentRoom.x + Math.floor(currentRoom.width / 2),
                y: currentRoom.y + Math.floor(currentRoom.height / 2)
            };
            
            // L字型の通路を作成
            if (Math.random() < 0.5) {
                this.createHorizontalTunnel(prevCenter.x, currentCenter.x, prevCenter.y);
                this.createVerticalTunnel(prevCenter.y, currentCenter.y, currentCenter.x);
            } else {
                this.createVerticalTunnel(prevCenter.y, currentCenter.y, prevCenter.x);
                this.createHorizontalTunnel(prevCenter.x, currentCenter.x, currentCenter.y);
            }
        }
    }
    
    createHorizontalTunnel(x1, x2, y) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.tiles[y][x] = TILE_TYPES.FLOOR;
            }
        }
    }
    
    createVerticalTunnel(y1, y2, x) {
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        for (let y = minY; y <= maxY; y++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.tiles[y][x] = TILE_TYPES.FLOOR;
            }
        }
    }
    
    placeStairs() {
        const lastRoom = this.rooms[this.rooms.length - 1];
        const stairsX = lastRoom.x + Math.floor(lastRoom.width / 2);
        const stairsY = lastRoom.y + Math.floor(lastRoom.height / 2);
        this.tiles[stairsY][stairsX] = TILE_TYPES.STAIRS;
    }
    
    render(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileX = x * GAME_CONFIG.TILE_SIZE;
                const tileY = y * GAME_CONFIG.TILE_SIZE;
                
                switch(this.tiles[y][x]) {
                    case TILE_TYPES.WALL:
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(tileX, tileY, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                        ctx.strokeStyle = '#654321';
                        ctx.strokeRect(tileX, tileY, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                        break;
                    case TILE_TYPES.FLOOR:
                        ctx.fillStyle = '#D2B48C';
                        ctx.fillRect(tileX, tileY, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                        break;
                    case TILE_TYPES.STAIRS:
                        ctx.fillStyle = '#D2B48C';
                        ctx.fillRect(tileX, tileY, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                        ctx.fillStyle = '#FFD700';
                        ctx.fillRect(tileX + 4, tileY + 4, GAME_CONFIG.TILE_SIZE - 8, GAME_CONFIG.TILE_SIZE - 8);
                        ctx.fillStyle = '#000';
                        ctx.font = '16px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('>', tileX + GAME_CONFIG.TILE_SIZE/2, tileY + GAME_CONFIG.TILE_SIZE/2 + 6);
                        break;
                }
            }
        }
    }
}

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.level = 1;
        this.hp = 100;
        this.maxHp = 100;
        this.attack = 10;
        this.defense = 5;
        this.exp = 0;
        this.expToNext = 100;
        this.gold = 0;
    }
    
    gainExp(amount) {
        this.exp += amount;
        while (this.exp >= this.expToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.maxHp += 20;
        this.hp = this.maxHp; // レベルアップ時に全回復
        this.attack += 3;
        this.defense += 2;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        
        game.addMessage(`レベルアップ！ Lv.${this.level}になった！`, 'level');
    }
    
    render(ctx) {
        const x = this.x * GAME_CONFIG.TILE_SIZE;
        const y = this.y * GAME_CONFIG.TILE_SIZE;
        
        // プレイヤー（シレン）を描画
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(x + 2, y + 2, GAME_CONFIG.TILE_SIZE - 4, GAME_CONFIG.TILE_SIZE - 4);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('シ', x + GAME_CONFIG.TILE_SIZE/2, y + GAME_CONFIG.TILE_SIZE/2 + 7);
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.name = type;
        this.alive = true;
        
        // 敵の種類に応じてステータス設定
        switch(type) {
            case 'スライム':
                this.hp = 20;
                this.maxHp = 20;
                this.attack = 5;
                this.defense = 1;
                this.expValue = 10;
                this.color = '#32CD32';
                break;
            case 'ゴブリン':
                this.hp = 35;
                this.maxHp = 35;
                this.attack = 8;
                this.defense = 3;
                this.expValue = 20;
                this.color = '#228B22';
                break;
            case 'オーク':
                this.hp = 50;
                this.maxHp = 50;
                this.attack = 12;
                this.defense = 5;
                this.expValue = 35;
                this.color = '#8B4513';
                break;
            case 'スケルトン':
                this.hp = 40;
                this.maxHp = 40;
                this.attack = 10;
                this.defense = 8;
                this.expValue = 30;
                this.color = '#F5F5DC';
                break;
        }
    }
    
    render(ctx) {
        const x = this.x * GAME_CONFIG.TILE_SIZE;
        const y = this.y * GAME_CONFIG.TILE_SIZE;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 2, y + 2, GAME_CONFIG.TILE_SIZE - 4, GAME_CONFIG.TILE_SIZE - 4);
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type[0], x + GAME_CONFIG.TILE_SIZE/2, y + GAME_CONFIG.TILE_SIZE/2 + 4);
    }
}

// アイテムクラス
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        
        switch(type) {
            case 'ポーション':
                this.color = '#FF1493';
                this.symbol = 'P';
                break;
            case 'パン':
                this.color = '#DEB887';
                this.symbol = 'B';
                break;
            case 'おにぎり':
                this.color = '#FFFFFF';
                this.symbol = 'O';
                break;
            case 'お金':
                this.color = '#FFD700';
                this.symbol = '$';
                break;
        }
    }
    
    render(ctx) {
        const x = this.x * GAME_CONFIG.TILE_SIZE;
        const y = this.y * GAME_CONFIG.TILE_SIZE;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 6, y + 6, GAME_CONFIG.TILE_SIZE - 12, GAME_CONFIG.TILE_SIZE - 12);
        
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.symbol, x + GAME_CONFIG.TILE_SIZE/2, y + GAME_CONFIG.TILE_SIZE/2 + 5);
    }
}

// ゲーム開始
let game;
window.addEventListener('load', () => {
    game = new Game();
});
