document.addEventListener('DOMContentLoaded', () => {
    // 关卡配置
    const levels = [
        { targetScore: 100, timeLimit: 60, colors: 6 },
        { targetScore: 200, timeLimit: 60, colors: 5 },
        { targetScore: 300, timeLimit: 60, colors: 5 },
        { targetScore: 400, timeLimit: 60, colors: 4 },
        { targetScore: 500, timeLimit: 60, colors: 4 },
        { targetScore: 600, timeLimit: 60, colors: 3 }
    ];

    // 动物图标配置
    const animalIcons = [
        { emoji: '🐱', imageUrl: 'https://img.icons8.com/color/96/000000/cat.png' },
        { emoji: '🐶', imageUrl: 'https://img.icons8.com/color/96/000000/dog.png' },
        { emoji: '🐰', imageUrl: 'https://img.icons8.com/color/96/000000/rabbit.png' },
        { emoji: '🦊', imageUrl: 'https://img.icons8.com/color/96/000000/fox.png' },
        { emoji: '🐻', imageUrl: 'https://img.icons8.com/color/96/000000/bear.png' },
        { emoji: '🐼', imageUrl: 'https://img.icons8.com/color/96/000000/panda.png' },
        { emoji: '🐨', imageUrl: 'https://img.icons8.com/color/96/000000/koala.png' },
        { emoji: '🦁', imageUrl: 'https://img.icons8.com/color/96/000000/lion.png' }
    ];

    // 游戏配置
    const config = {
        boardSize: 8,
        tileColors: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3'],
        minimumMatchLength: 3,
        useEmoji: true // 设置为 true 使用emoji, false 使用图片URL
    };

    // 游戏状态
    let gameState = {
        board: [],
        selectedTile: null,
        score: 0,
        isProcessing: false,
        currentLevel: 1,
        timeRemaining: 60,
        timerInterval: null,
        gameActive: false
    };

    // DOM元素
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const targetScoreDisplay = document.getElementById('target-score');
    const levelDisplay = document.getElementById('level');
    const timeDisplay = document.getElementById('time');
    const restartButton = document.getElementById('restart-button');
    const nextLevelButton = document.getElementById('next-level-button');
    const levelMessageDisplay = document.getElementById('level-message');

    // 初始化游戏
    function initGame(level = 1) {
        // 清除之前的计时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        
        // 设置当前关卡
        gameState.currentLevel = level;
        const levelConfig = levels[level - 1];
        
        // 根据关卡设置游戏参数
        const colors = levelConfig.colors;
        config.tileColors = config.tileColors.slice(0, colors);
        
        // 初始化游戏状态
        gameState.board = createBoard();
        gameState.score = 0;
        gameState.selectedTile = null;
        gameState.isProcessing = false;
        gameState.timeRemaining = levelConfig.timeLimit;
        gameState.gameActive = true;
        
        // 更新UI
        renderBoard();
        updateScore();
        updateLevel();
        updateTimer();
        
        // 隐藏下一关按钮
        nextLevelButton.style.display = 'none';
        levelMessageDisplay.textContent = '';
        
        // 检查初始局面是否有可消除的组合
        const initialMatches = findAllMatches();
        if (initialMatches.length > 0) {
            shuffleBoard();
        }
        
        // 启动计时器
        startTimer();
    }

    // 打乱游戏板
    function shuffleBoard() {
        // 重新生成游戏板
        gameState.board = createBoard();
        renderBoard();
        
        // 再次检查是否有匹配
        const matches = findAllMatches();
        if (matches.length > 0) {
            shuffleBoard(); // 递归调用直到没有初始匹配
        }
    }

    // 创建游戏板
    function createBoard() {
        const board = [];
        
        for (let row = 0; row < config.boardSize; row++) {
            board[row] = [];
            for (let col = 0; col < config.boardSize; col++) {
                const iconIndex = Math.floor(Math.random() * config.tileColors.length);
                board[row][col] = {
                    color: config.tileColors[iconIndex],
                    animalIcon: animalIcons[iconIndex],
                    row,
                    col
                };
            }
        }
        
        return board;
    }

    // 渲染游戏板
    function renderBoard() {
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${config.boardSize}, 50px)`;
        gameBoard.style.gridTemplateRows = `repeat(${config.boardSize}, 50px)`;
        
        for (let row = 0; row < config.boardSize; row++) {
            for (let col = 0; col < config.boardSize; col++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                
                // 设置背景色为浅色
                tile.style.backgroundColor = '#f8f8f8';
                
                // 根据设置选择使用emoji或图片
                if (config.useEmoji) {
                    // 使用emoji
                    tile.textContent = gameState.board[row][col].animalIcon.emoji;
                    tile.classList.add('emoji-tile');
                } else {
                    // 使用图片
                    const img = document.createElement('img');
                    img.src = gameState.board[row][col].animalIcon.imageUrl;
                    img.alt = gameState.board[row][col].animalIcon.emoji;
                    img.classList.add('animal-icon');
                    tile.appendChild(img);
                }
                
                tile.dataset.row = row;
                tile.dataset.col = col;
                
                tile.addEventListener('click', () => handleTileClick(row, col));
                
                gameBoard.appendChild(tile);
            }
        }
    }

    // 处理点击事件
    function handleTileClick(row, col) {
        if (gameState.isProcessing || !gameState.gameActive) return;
        
        const clickedTile = gameState.board[row][col];
        
        // 如果没有选中的方块，选中当前方块
        if (!gameState.selectedTile) {
            gameState.selectedTile = clickedTile;
            highlightTile(row, col, true);
            return;
        }
        
        // 如果点击的是已选中的方块，取消选中
        if (gameState.selectedTile === clickedTile) {
            gameState.selectedTile = null;
            highlightTile(row, col, false);
            return;
        }
        
        // 如果点击的方块与已选中方块相邻
        if (areAdjacent(gameState.selectedTile, clickedTile)) {
            // 交换方块
            swapTiles(gameState.selectedTile, clickedTile);
            
            // 检查是否形成匹配
            const matches = findAllMatches();
            if (matches.length > 0) {
                // 有匹配，移除方块并填充空位
                removeMatches(matches);
            } else {
                // 没有匹配，交换回来
                swapTiles(gameState.selectedTile, clickedTile);
            }
            
            // 重置选中状态
            highlightTile(gameState.selectedTile.row, gameState.selectedTile.col, false);
            gameState.selectedTile = null;
        } else {
            // 如果不相邻，选中新方块
            highlightTile(gameState.selectedTile.row, gameState.selectedTile.col, false);
            gameState.selectedTile = clickedTile;
            highlightTile(row, col, true);
        }
    }

    // 高亮选中的方块
    function highlightTile(row, col, isSelected) {
        const tileElements = document.querySelectorAll('.tile');
        const index = row * config.boardSize + col;
        
        if (isSelected) {
            tileElements[index].classList.add('selected');
        } else {
            tileElements[index].classList.remove('selected');
        }
    }

    // 检查两个方块是否相邻
    function areAdjacent(tile1, tile2) {
        const rowDiff = Math.abs(tile1.row - tile2.row);
        const colDiff = Math.abs(tile1.col - tile2.col);
        
        // 如果行差是1且列差是0，或者列差是1且行差是0，则它们是相邻的
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    // 交换两个方块
    function swapTiles(tile1, tile2) {
        // 交换颜色和图标
        const tempColor = tile1.color;
        const tempAnimalIcon = tile1.animalIcon;
        
        tile1.color = tile2.color;
        tile1.animalIcon = tile2.animalIcon;
        
        tile2.color = tempColor;
        tile2.animalIcon = tempAnimalIcon;
        
        // 更新DOM
        updateTile(tile1.row, tile1.col);
        updateTile(tile2.row, tile2.col);
    }

    // 更新单个方块的显示
    function updateTile(row, col) {
        const tileElements = document.querySelectorAll('.tile');
        const index = row * config.boardSize + col;
        if (tileElements[index]) {
            const tile = tileElements[index];
            
            // 清空现有内容
            tile.innerHTML = '';
            
            if (gameState.board[row][col].animalIcon) {
                if (config.useEmoji) {
                    // 使用emoji
                    tile.textContent = gameState.board[row][col].animalIcon.emoji;
                } else {
                    // 使用图片
                    const img = document.createElement('img');
                    img.src = gameState.board[row][col].animalIcon.imageUrl;
                    img.alt = gameState.board[row][col].animalIcon.emoji;
                    img.classList.add('animal-icon');
                    tile.appendChild(img);
                }
            }
        }
    }

    // 寻找所有匹配
    function findAllMatches() {
        const matches = [];
        
        // 检查水平匹配
        for (let row = 0; row < config.boardSize; row++) {
            for (let col = 0; col <= config.boardSize - config.minimumMatchLength; col++) {
                const color = gameState.board[row][col].color;
                if (!color) continue; // 跳过空方块
                
                let matchLength = 1;
                
                for (let i = 1; i < config.boardSize - col; i++) {
                    if (gameState.board[row][col + i].color === color) {
                        matchLength++;
                    } else {
                        break;
                    }
                }
                
                if (matchLength >= config.minimumMatchLength) {
                    for (let i = 0; i < matchLength; i++) {
                        matches.push({row, col: col + i});
                    }
                    col += matchLength - 1;
                }
            }
        }
        
        // 检查垂直匹配
        for (let col = 0; col < config.boardSize; col++) {
            for (let row = 0; row <= config.boardSize - config.minimumMatchLength; row++) {
                const color = gameState.board[row][col].color;
                if (!color) continue; // 跳过空方块
                
                let matchLength = 1;
                
                for (let i = 1; i < config.boardSize - row; i++) {
                    if (gameState.board[row + i][col].color === color) {
                        matchLength++;
                    } else {
                        break;
                    }
                }
                
                if (matchLength >= config.minimumMatchLength) {
                    for (let i = 0; i < matchLength; i++) {
                        matches.push({row: row + i, col});
                    }
                    row += matchLength - 1;
                }
            }
        }
        
        return matches;
    }

    // 移除匹配的方块
    function removeMatches(matches) {
        gameState.isProcessing = true;
        
        // 为每个匹配的方块添加动画效果
        const tileElements = document.querySelectorAll('.tile');
        matches.forEach(({row, col}) => {
            const index = row * config.boardSize + col;
            if (tileElements[index]) {
                tileElements[index].classList.add('match');
            }
        });
        
        // 增加分数
        gameState.score += matches.length * 10;
        updateScore();
        
        // 检查是否达到目标分数
        checkLevelComplete();
        
        // 动画完成后移除方块
        setTimeout(() => {
            matches.forEach(({row, col}) => {
                if (gameState.board[row] && gameState.board[row][col]) {
                    gameState.board[row][col].color = null;
                    gameState.board[row][col].animalIcon = null;
                    updateTile(row, col);
                }
            });
            
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
        }, 500);
    }

    // 填充空白位置
    function fillEmptySpaces() {
        let hasMoved = false;
        
        // 方块下落
        for (let col = 0; col < config.boardSize; col++) {
            for (let row = config.boardSize - 1; row >= 0; row--) {
                if (!gameState.board[row][col].animalIcon || gameState.board[row][col].color === null) {
                    // 寻找该列上方最近的非空方块
                    let sourceRow = row - 1;
                    while (sourceRow >= 0) {
                        if (gameState.board[sourceRow][col].animalIcon && gameState.board[sourceRow][col].color !== null) {
                            // 移动方块
                            gameState.board[row][col].color = gameState.board[sourceRow][col].color;
                            gameState.board[row][col].animalIcon = gameState.board[sourceRow][col].animalIcon;
                            gameState.board[sourceRow][col].color = null;
                            gameState.board[sourceRow][col].animalIcon = null;
                            hasMoved = true;
                            break;
                        }
                        sourceRow--;
                    }
                    
                    // 如果没有找到非空方块，生成新方块
                    if (!gameState.board[row][col].animalIcon || gameState.board[row][col].color === null) {
                        const iconIndex = Math.floor(Math.random() * config.tileColors.length);
                        gameState.board[row][col].color = config.tileColors[iconIndex];
                        gameState.board[row][col].animalIcon = animalIcons[iconIndex];
                        hasMoved = true;
                    }
                    
                    updateTile(row, col);
                }
            }
        }
        
        // 如果有移动，渲染游戏板
        if (hasMoved) {
            renderBoard();
        }
        
        // 检查是否有新的匹配
        setTimeout(() => {
            const newMatches = findAllMatches();
            if (newMatches.length > 0) {
                removeMatches(newMatches);
            } else {
                gameState.isProcessing = false;
            }
        }, 300);
    }

    // 更新分数显示
    function updateScore() {
        scoreDisplay.textContent = gameState.score;
        const currentLevel = gameState.currentLevel - 1;
        targetScoreDisplay.textContent = levels[currentLevel].targetScore;
    }

    // 更新关卡显示
    function updateLevel() {
        levelDisplay.textContent = gameState.currentLevel;
    }

    // 更新计时器显示
    function updateTimer() {
        timeDisplay.textContent = gameState.timeRemaining;
    }

    // 启动计时器
    function startTimer() {
        gameState.timerInterval = setInterval(() => {
            gameState.timeRemaining--;
            updateTimer();
            
            if (gameState.timeRemaining <= 0) {
                endLevel(false);
            }
        }, 1000);
    }

    // 检查关卡是否完成
    function checkLevelComplete() {
        const currentLevel = gameState.currentLevel - 1;
        if (gameState.score >= levels[currentLevel].targetScore) {
            endLevel(true);
        }
    }

    // 结束关卡
    function endLevel(isSuccess) {
        // 停止游戏
        gameState.gameActive = false;
        clearInterval(gameState.timerInterval);
        
        // 显示结果信息
        if (isSuccess) {
            levelMessageDisplay.textContent = `恭喜！你通过了第${gameState.currentLevel}关！`;
            levelMessageDisplay.className = 'level-message success';
            
            // 如果还有下一关，显示下一关按钮
            if (gameState.currentLevel < levels.length) {
                nextLevelButton.style.display = 'inline-block';
            } else {
                levelMessageDisplay.textContent += ' 你已完成所有关卡！';
            }
        } else {
            levelMessageDisplay.textContent = `时间到！你未能通过第${gameState.currentLevel}关。`;
            levelMessageDisplay.className = 'level-message failure';
        }
    }

    // 进入下一关
    function nextLevel() {
        if (gameState.currentLevel < levels.length) {
            initGame(gameState.currentLevel + 1);
        }
    }

    // 事件监听
    restartButton.addEventListener('click', () => initGame(gameState.currentLevel));
    nextLevelButton.addEventListener('click', nextLevel);

    // 添加切换图标类型的按钮
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-icon-mode';
    toggleButton.textContent = config.useEmoji ? '切换到图片模式' : '切换到表情符号模式';
    toggleButton.addEventListener('click', () => {
        config.useEmoji = !config.useEmoji;
        toggleButton.textContent = config.useEmoji ? '切换到图片模式' : '切换到表情符号模式';
        renderBoard();
    });
    
    // 将按钮添加到按钮组
    document.querySelector('.buttons').appendChild(toggleButton);

    // 初始化游戏
    try {
        initGame();
        console.log("游戏初始化成功！");
    } catch (e) {
        console.error("游戏初始化失败:", e);
    }
}); 