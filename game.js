class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.gameTime = 0;
        this.maxGameTime = 20 * 60 * 1000; // 20 minutes in milliseconds
        this.lastTime = 0;
        this.isPaused = false;
        this.gameOver = false;
        
        // 점수 및 보스 시스템
        this.score = 0;
        this.bossesKilled = 0;
        this.waveLevel = 1;
        this.nextBossScore = 50;
        this.currentBossColor = '#ff4444'; // 현재 웨이브의 몬스터 색상
        
        // 몬스터 관리 시스템
        this.maxEnemies = 8; // 시작 시 최대 8마리
        this.baseSpawnRate = 0.008; // 시작 스폰율 (0.8%)
        this.lastSpawnTime = 0;
        this.spawnCooldown = 2000; // 2초 쿨다운으로 시작
        
        // 통합 난이도 시스템
        this.totalMonstersSpawned = 0; // 총 몬스터 생성 수
        this.totalBossesSpawned = 0;   // 총 보스 생성 수
        this.difficultyIndex = 1.0;    // 통합 난이도 지수
        
        // 특별 웨이브 시스템
        this.specialWaveTimer = 0;
        this.nextSpecialWave = 30000; // 30초마다 특별 웨이브
        this.isSpecialWave = false;
        this.specialWaveEndTime = 0;
        
        // 적응형 난이도 시스템
        this.totalDamageDealt = 0;
        this.survivalTime = 0;
        this.currentDPS = 0;
        this.lastDPSCheck = 0;
        this.dpsCheckInterval = 5000; // 5초마다 DPS 측정
        this.difficultyMultiplier = 1.0;
        
        // 카메라 시스템
        this.camera = {
            x: 0,
            y: 0,
            worldWidth: 10000,
            worldHeight: 10000
        };
        
        this.player = new Player(0, 0, this); // 월드 좌표 (0,0)에서 시작
        this.enemies = [];
        this.projectiles = [];
        this.experienceGems = [];
        this.bossProjectiles = [];
        
        this.keys = {};
        
        // 마우스 트래킹 시스템
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            leftPressed: false,
            rightPressed: false
        };
        
        this.setupEventListeners();
        
        // Ensure modal is hidden initially and update UI
        const modal = document.getElementById('level-up-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Initialize player UI
        this.player.updateUI();
        this.updateScore();
        
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 0키로 레벨업 테스트
            if (e.code === 'Digit0') {
                if (this.player && this.player.gainExperience) {
                    // 안전한 값으로 고정 경험치 지급
                    this.player.gainExperience(100);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // 마우스 움직임 추적
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            
            // 월드 좌표로 변환 (카메라 시스템에 맞게 수정)
            this.mouse.worldX = this.mouse.x - this.canvas.width / 2 + this.camera.x;
            this.mouse.worldY = this.mouse.y - this.canvas.height / 2 + this.camera.y;
        });
        
        // 마우스 클릭 이벤트
        this.canvas.addEventListener('mousedown', (e) => {
            console.log('마우스 클릭 이벤트:', e.button, 'x:', e.clientX, 'y:', e.clientY);
            e.preventDefault();
            if (e.button === 0) { // 좌클릭
                console.log('좌클릭 버튼 감지됨');
                this.mouse.leftPressed = true;
                this.handleLeftClick();
            } else if (e.button === 2) { // 우클릭
                console.log('우클릭 버튼 감지됨');
                this.mouse.rightPressed = true;
                this.handleRightClick();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.leftPressed = false;
            } else if (e.button === 2) {
                this.mouse.rightPressed = false;
            }
        });
        
        // 우클릭 컨텍스트 메뉴 비활성화
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    // 좌클릭 처리 - 기본 공격
    handleLeftClick() {
        console.log('=== 좌클릭 핸들러 호출됨 ===');
        console.log('게임 상태 - isPaused:', this.isPaused, 'gameOver:', this.gameOver);
        console.log('마우스 위치:', this.mouse.x, this.mouse.y, '월드:', this.mouse.worldX, this.mouse.worldY);
        
        if (this.isPaused || this.gameOver) {
            console.log('게임 일시정지 또는 게임오버 상태로 인해 공격 취소');
            return;
        }
        
        // 플레이어에서 마우스 위치로 발사체 생성
        console.log('fireProjectileToTarget 호출 시도');
        this.player.fireProjectileToTarget(this.mouse.worldX, this.mouse.worldY, this);
        
        // 방향 계산 확인
        const dx = this.mouse.worldX - this.player.x;
        const dy = this.mouse.worldY - this.player.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        console.log('방향 계산:');
        console.log('  플레이어 위치:', this.player.x, this.player.y);
        console.log('  마우스 월드 좌표:', this.mouse.worldX, this.mouse.worldY);
        console.log('  dx:', dx, 'dy:', dy);
        console.log('  거리:', distance, '각도:', angle, '각도(도):', angle * 180 / Math.PI);
        
        // 쿨다운 체크 (0.3초 간격)
        const currentTime = Date.now();
        if (currentTime - this.player.lastAttackTime < 300) {
            console.log('공격 쿨다운 중:', currentTime - this.player.lastAttackTime, 'ms');
            return;
        }
        
        // 직접 투사체 생성 (정확한 방향으로, 관통 없음)
        const testProjectile = new Projectile(
            this.player.x, 
            this.player.y, 
            angle, 
            15, // 데미지
            0,  // 관통력 0 (한 번만 맞히고 사라짐)
            false, // 치명타
            1.0, // 크기
            { fire: true, frost: false, poison: false, explosive: false } // 화염 효과
        );
        
        this.player.lastAttackTime = currentTime;
        
        this.projectiles.push(testProjectile);
        console.log('직접 투사체 추가됨, 현재 투사체 수:', this.projectiles.length);
    }
    
    // 우클릭 처리 - 스킬 공격 (범위 발사체)
    handleRightClick() {
        if (this.isPaused || this.gameOver) return;
        
        // 스킬 쿨다운 체크
        if (this.player.canUseSkill()) {
            this.player.useAreaSkill(this.mouse.worldX, this.mouse.worldY, this);
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        this.render();
        
        // 렌더링 후에 cleanup 수행
        if (!this.isPaused) {
            this.cleanup();
        }
        
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // 게임오버 체크
        if (this.player.health <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.showGameOverScreen();
            return;
        }
        
        this.gameTime += deltaTime;
        this.updateTimer();
        
        this.player.update(deltaTime, this.keys);
        
        // 개선된 몬스터 스폰 시스템
        this.updateEnemySpawning(deltaTime);
        
        // 특별 웨이브 시스템 업데이트
        this.updateSpecialWaves(deltaTime);
        
        // 통합 난이도 시스템 업데이트
        this.updateIntegratedDifficulty();
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (enemy.isBoss) {
                enemy.update(deltaTime, this.player, this);
            } else {
                enemy.update(deltaTime, this.player, this); // 일반 적도 게임 참조 전달
            }
        });
        
        // Update projectiles
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);
        });
        
        // Update boss projectiles
        this.bossProjectiles.forEach(projectile => {
            projectile.x += Math.cos(projectile.angle) * projectile.speed * deltaTime / 1000;
            projectile.y += Math.sin(projectile.angle) * projectile.speed * deltaTime / 1000;
            
            // Remove if too far from player (infinite map system)
            const dx = projectile.x - this.player.x;
            const dy = projectile.y - this.player.y;
            const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromPlayer > 1000) { // 플레이어로부터 1000 거리 초과 시 제거
                projectile.dead = true;
            }
        });
        
        // Update experience gems
        this.experienceGems.forEach(gem => {
            gem.update(deltaTime, this.player);
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Clean up dead objects는 render 후에 수행
        // this.cleanup();
        
        // 자동 공격 제거 - 이제 마우스 클릭으로만 공격
        // this.player.autoAttack(deltaTime, this.enemies, this.projectiles);
        
        // 적응형 난이도 업데이트
        this.updateAdaptiveDifficulty(deltaTime);
        
        // 카메라 업데이트
        this.updateCamera();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 카메라 변환 시작
        this.ctx.save();
        this.ctx.translate(-this.camera.x + this.canvas.width / 2, -this.camera.y + this.canvas.height / 2);
        
        // 배경 격자 그리기 (선택사항)
        this.renderBackground();
        
        this.player.render(this.ctx);
        
        this.enemies.forEach(enemy => {
            if (this.isVisibleOnScreen(enemy)) {
                enemy.render(this.ctx);
            }
        });
        
        console.log('렌더링할 투사체 수:', this.projectiles.length);
        this.projectiles.forEach((projectile, index) => {
            if (this.isVisibleOnScreen(projectile)) {
                console.log('투사체 렌더링:', index, projectile.x, projectile.y, projectile.dead);
                projectile.render(this.ctx);
            } else {
                console.log('투사체 화면 밖:', index, projectile.x, projectile.y);
            }
        });
        
        this.experienceGems.forEach(gem => {
            if (this.isVisibleOnScreen(gem)) {
                gem.render(this.ctx);
            }
        });
        
        this.bossProjectiles.forEach(projectile => {
            if (this.isVisibleOnScreen(projectile)) {
                this.ctx.fillStyle = projectile.color;
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // 연쇄 번개 시각 효과 렌더링
        if (this.visualEffects) {
            this.visualEffects.forEach(effect => {
                if (effect.timeLeft > 0) {
                    effect.render(this.ctx);
                    effect.timeLeft -= 16; // 대략 60fps 기준
                }
            });
            // 만료된 효과 제거
            this.visualEffects = this.visualEffects.filter(effect => effect.timeLeft > 0);
        }
        
        // 카메라 변환 종료
        this.ctx.restore();
        
        // 에임 가이드 렌더링 (스크린 좌표)
        this.renderAim();
    }
    
    // 에임 가이드 렌더링
    renderAim() {
        // 마우스 커서 위치에 조준점 그리기
        this.ctx.save();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;
        
        // 십자 조준점
        const crossSize = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x - crossSize, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + crossSize, this.mouse.y);
        this.ctx.moveTo(this.mouse.x, this.mouse.y - crossSize);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + crossSize);
        this.ctx.stroke();
        
        // 스킬 쿨다운 표시
        const currentTime = Date.now();
        const skillCooldownRemaining = Math.max(0, this.player.skillCooldown - (currentTime - this.player.lastSkillTime));
        
        if (skillCooldownRemaining > 0) {
            // 쿨다운 중일 때 빨간 원
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 쿨다운 타이머 텍스트
            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(Math.ceil(skillCooldownRemaining / 1000), this.mouse.x, this.mouse.y - 20);
        } else {
            // 사용 가능할 때 초록 원
            this.ctx.strokeStyle = '#44ff44';
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 15, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    updateEnemySpawning(deltaTime) {
        const currentTime = Date.now();
        const currentEnemyCount = this.enemies.filter(enemy => !enemy.isBoss).length;
        
        // 레벨별 동적 조정
        const playerLevel = this.player.level;
        const currentMaxEnemies = this.calculateMaxEnemies(playerLevel);
        const currentSpawnCooldown = this.calculateSpawnCooldown(playerLevel);
        
        // 몬스터 수가 최대치 미만이고 쿨다운이 지났으면 스폰
        if (currentEnemyCount < currentMaxEnemies && 
            currentTime - this.lastSpawnTime >= currentSpawnCooldown) {
            
            // 레벨이 높을수록 여러 마리 동시 스폰 가능
            const spawnCount = this.calculateSpawnCount(playerLevel, currentEnemyCount, currentMaxEnemies);
            
            for (let i = 0; i < spawnCount; i++) {
                if (currentEnemyCount + i < currentMaxEnemies) {
                    this.spawnEnemy();
                }
            }
            
            this.lastSpawnTime = currentTime;
        }
    }
    
    updateIntegratedDifficulty() {
        const playerLevel = this.player.level;
        const monstersSpawned = this.totalMonstersSpawned;
        const bossesSpawned = this.totalBossesSpawned;
        
        // 통합 난이도 지수 계산
        // 1. 플레이어 레벨 기여도 (40%)
        const levelFactor = Math.pow(playerLevel, 1.3) * 0.4;
        
        // 2. 몬스터 생성 수 기여도 (35%)
        const monsterFactor = Math.pow(monstersSpawned / 100, 1.1) * 0.35;
        
        // 3. 보스 생성 수 기여도 (25%)
        const bossFactor = Math.pow(bossesSpawned, 1.4) * 0.25;
        
        // 통합 난이도 지수 (최소 1.0, 최대 10.0)
        this.difficultyIndex = Math.max(1.0, Math.min(10.0, 1.0 + levelFactor + monsterFactor + bossFactor));
        
        // 디버그 로그 (10초마다)
        if (Math.floor(this.gameTime / 10000) !== Math.floor((this.gameTime - 16) / 10000)) {
            console.log(`🎯 난이도 지수: ${this.difficultyIndex.toFixed(2)} (레벨:${playerLevel}, 몬스터:${monstersSpawned}, 보스:${bossesSpawned})`);
        }
    }
    
    calculateMaxEnemies(playerLevel) {
        // 통합 난이도 기반 최대 몬스터 수 계산
        const baseMonstersForLevel = this.getBaseMonstersForLevel(playerLevel);
        const difficultyMultiplier = 0.5 + (this.difficultyIndex * 0.15); // 0.5 ~ 2.0 배율
        
        return Math.floor(baseMonstersForLevel * difficultyMultiplier);
    }
    
    getBaseMonstersForLevel(playerLevel) {
        // 기본 레벨별 몬스터 수 (난이도 지수 적용 전)
        if (playerLevel <= 3) return 6 + playerLevel; // 레벨 1-3: 7-9마리
        if (playerLevel <= 6) return 10 + (playerLevel - 3) * 2; // 레벨 4-6: 12-16마리  
        if (playerLevel <= 10) return 16 + (playerLevel - 6) * 2; // 레벨 7-10: 18-24마리
        return Math.min(30, 24 + (playerLevel - 10) * 1); // 레벨 11+: 최대 30마리
    }
    
    calculateSpawnCooldown(playerLevel) {
        // 통합 난이도 기반 스폰 간격 계산
        const baseCooldown = 2500; // 2.5초 기본
        
        // 레벨 기반 감소
        const levelReduction = Math.min(1200, (playerLevel - 1) * 80); // 레벨당 0.08초 단축
        
        // 난이도 지수 기반 추가 감소
        const difficultyReduction = (this.difficultyIndex - 1.0) * 150; // 난이도 지수당 0.15초 단축
        
        const totalReduction = levelReduction + difficultyReduction;
        return Math.max(600, baseCooldown - totalReduction); // 최소 0.6초
    }
    
    calculateSpawnCount(playerLevel, currentCount, maxCount) {
        // 초기에는 1마리씩, 높은 레벨에서는 여러 마리 동시 스폰
        if (playerLevel <= 5) return 1;
        if (playerLevel <= 10) return Math.random() < 0.3 ? 2 : 1; // 30% 확률로 2마리
        if (playerLevel <= 15) return Math.random() < 0.5 ? 2 : 1; // 50% 확률로 2마리
        
        // 고레벨에서는 웨이브 형태로 스폰 (최대 수의 1/3까지 남았을 때 보충)
        const remainingSpace = maxCount - currentCount;
        if (remainingSpace >= maxCount * 0.7) { // 30% 이하로 줄었을 때
            return Math.min(3, Math.floor(remainingSpace / 2)); // 최대 3마리까지 한번에
        }
        return Math.random() < 0.4 ? 2 : 1;
    }
    
    updateSpecialWaves(deltaTime) {
        this.specialWaveTimer += deltaTime;
        
        // 특별 웨이브 시작 체크
        if (!this.isSpecialWave && this.specialWaveTimer >= this.nextSpecialWave) {
            this.startSpecialWave();
        }
        
        // 특별 웨이브 종료 체크
        if (this.isSpecialWave && Date.now() >= this.specialWaveEndTime) {
            this.endSpecialWave();
        }
    }
    
    startSpecialWave() {
        this.isSpecialWave = true;
        this.specialWaveEndTime = Date.now() + 15000; // 15초간 지속
        this.specialWaveTimer = 0;
        this.nextSpecialWave = 45000 + Math.random() * 30000; // 45-75초 후 다음 웨이브
        
        // 웨이브 타입 선택
        const waveTypes = ['horde', 'elite', 'speed', 'tank'];
        const waveType = waveTypes[Math.floor(Math.random() * waveTypes.length)];
        
        this.executeSpecialWave(waveType);
        
        console.log(`🌊 특별 웨이브 시작: ${waveType}`);
    }
    
    executeSpecialWave(waveType) {
        const playerLevel = this.player.level;
        
        switch (waveType) {
            case 'horde':
                // 몰이 웨이브 - 약한 몬스터 대량 스폰
                this.spawnHordeWave(playerLevel);
                break;
            case 'elite':
                // 엘리트 웨이브 - 강한 몬스터 소수 스폰
                this.spawnEliteWave(playerLevel);
                break;
            case 'speed':
                // 속도 웨이브 - 빠른 몬스터들
                this.spawnSpeedWave(playerLevel);
                break;
            case 'tank':
                // 탱커 웨이브 - 체력 높은 몬스터들
                this.spawnTankWave(playerLevel);
                break;
        }
    }
    
    spawnHordeWave(playerLevel) {
        // 일반 몬스터의 2배 수만큼 약한 몬스터 스폰
        const count = Math.min(15, 8 + playerLevel);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const enemy = this.createSpecialEnemy('weak');
                if (enemy) {
                    this.enemies.push(enemy);
                    this.totalMonstersSpawned++; // 특별 웨이브도 카운터에 포함
                }
            }, i * 300); // 0.3초 간격으로 스폰
        }
    }
    
    spawnEliteWave(playerLevel) {
        // 강한 몬스터 3-5마리
        const count = Math.min(5, 3 + Math.floor(playerLevel / 3));
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const enemy = this.createSpecialEnemy('elite');
                if (enemy) {
                    this.enemies.push(enemy);
                    this.totalMonstersSpawned++;
                }
            }, i * 1000); // 1초 간격
        }
    }
    
    spawnSpeedWave(playerLevel) {
        const count = Math.min(10, 5 + Math.floor(playerLevel / 2));
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const enemy = this.createSpecialEnemy('fast');
                if (enemy) {
                    this.enemies.push(enemy);
                    this.totalMonstersSpawned++;
                }
            }, i * 400);
        }
    }
    
    spawnTankWave(playerLevel) {
        const count = Math.min(6, 3 + Math.floor(playerLevel / 4));
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const enemy = this.createSpecialEnemy('tank');
                if (enemy) {
                    this.enemies.push(enemy);
                    this.totalMonstersSpawned++;
                }
            }, i * 800);
        }
    }
    
    createSpecialEnemy(type) {
        // 스폰 위치 계산
        const side = Math.floor(Math.random() * 4);
        let x, y;
        const spawnDistance = 300;
        
        switch (side) {
            case 0: // Top
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y - spawnDistance;
                break;
            case 1: // Right
                x = this.player.x + spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
            case 2: // Bottom
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y + spawnDistance;
                break;
            case 3: // Left
                x = this.player.x - spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
        }
        
        // 통합 난이도 기반 특수 몬스터 생성
        const adjustedDifficultyMultiplier = this.difficultyMultiplier * this.difficultyIndex;
        const enemy = new Enemy(x, y, this.waveLevel, this.currentBossColor, adjustedDifficultyMultiplier);
        
        // 특수 타입별 수정
        switch (type) {
            case 'weak':
                enemy.health = Math.floor(enemy.health * 0.6);
                enemy.maxHealth = enemy.health;
                enemy.damage = Math.floor(enemy.damage * 0.7);
                enemy.scoreValue = Math.floor(enemy.scoreValue * 0.8);
                enemy.color = '#ffcccc'; // 연한 빨간색
                break;
            case 'elite':
                enemy.health = Math.floor(enemy.health * 1.8);
                enemy.maxHealth = enemy.health;
                enemy.damage = Math.floor(enemy.damage * 1.4);
                enemy.scoreValue = Math.floor(enemy.scoreValue * 2.5);
                enemy.color = '#8800ff'; // 보라색
                enemy.radius = 18; // 더 크게
                break;
            case 'fast':
                enemy.speed = Math.floor(enemy.speed * 2.0); // 1.6배 → 2.0배로 증가
                enemy.health = Math.floor(enemy.health * 0.7); // 0.8배 → 0.7배로 감소
                enemy.maxHealth = enemy.health;
                enemy.scoreValue = Math.floor(enemy.scoreValue * 1.2);
                enemy.color = '#00ffff'; // 청록색
                break;
            case 'tank':
                enemy.health = Math.floor(enemy.health * 2.5); // 2.2배 → 2.5배로 증가
                enemy.maxHealth = enemy.health;
                enemy.speed = Math.floor(enemy.speed * 0.4); // 0.6배 → 0.4배로 감소 (더 느리게)
                enemy.damage = Math.floor(enemy.damage * 1.3); // 1.2배 → 1.3배로 증가
                enemy.scoreValue = Math.floor(enemy.scoreValue * 1.8);
                enemy.color = '#666666'; // 회색
                enemy.radius = 20; // 더 크게
                break;
        }
        
        return enemy;
    }
    
    endSpecialWave() {
        this.isSpecialWave = false;
        console.log('✅ 특별 웨이브 종료');
    }
    
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        // 화면 경계에서 일정 거리 떨어진 위치에 스폰
        const spawnDistance = 200; // 스폰 거리
        
        switch (side) {
            case 0: // Top
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y - spawnDistance;
                break;
            case 1: // Right
                x = this.player.x + spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
            case 2: // Bottom
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y + spawnDistance;
                break;
            case 3: // Left
                x = this.player.x - spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
        }
        
        // 통합 난이도 기반 몬스터 생성
        const adjustedDifficultyMultiplier = this.difficultyMultiplier * this.difficultyIndex;
        this.enemies.push(new Enemy(x, y, this.waveLevel, this.currentBossColor, adjustedDifficultyMultiplier));
        
        // 몬스터 생성 카운터 증가
        this.totalMonstersSpawned++;
    }
    
    checkCollisions() {
        // Projectile vs Enemy
        this.projectiles.forEach(projectile => {
            if (projectile.dead) return;
            
            this.enemies.forEach(enemy => {
                if (enemy.dead || projectile.hitEnemies.has(enemy)) return;
                
                if (this.isColliding(projectile, enemy)) {
                    let actualDamage = projectile.damage;
                    
                    // 보스 방어력 적용
                    if (enemy.isBoss && enemy.damageReduction) {
                        actualDamage = Math.max(1, actualDamage * (1 - enemy.damageReduction));
                    }
                    
                    enemy.takeDamage(actualDamage);
                    this.recordDamage(actualDamage); // DPS 추적
                    projectile.hitEnemies.add(enemy);
                    
                    // 연쇄 번개 효과
                    if (this.player.chainLightning && Math.random() < 0.6) { // 60% 확률로 연쇄
                        this.createChainLightning(enemy, actualDamage * 0.5, 2); // 50% 데미지로 2번 연쇄
                    }
                    
                    // 특수 효과 적용
                    this.applyProjectileEffects(projectile, enemy, actualDamage);
                    
                    // 폭발 효과 (다른 효과들과 달리 즉시 처리)
                    if (projectile.effects.explosive) {
                        this.createExplosion(enemy.x, enemy.y, actualDamage * 0.5, 80);
                        projectile.dead = true; // 폭발 투사체는 즉시 소멸
                        return;
                    }
                    
                    // 관통력 처리
                    if (projectile.piercesRemaining <= 0) {
                        // 관통력이 0이면 즉시 제거
                        projectile.dead = true;
                    } else {
                        // 관통력이 있으면 1 감소
                        projectile.piercesRemaining--;
                        // 감소 후 0이 되면 제거
                        if (projectile.piercesRemaining <= 0) {
                            projectile.dead = true;
                        }
                    }
                    
                    if (enemy.dead) {
                        // 개선된 경험치 시스템: 적 타입과 점수에 따라 다른 경험치
                        this.spawnExperienceGem(enemy.x, enemy.y, enemy);
                        
                        // 점수 추가
                        this.addScore(enemy.scoreValue);
                        
                        // 보스 처치 시 특별 처리
                        if (enemy.isBoss) {
                            this.bossesKilled++;
                            this.waveLevel++;
                            console.log(`보스 처치! 웨이브 레벨: ${this.waveLevel}`);
                            
                            // 보스 처치 시 추가 레벨업 보너스
                            this.player.gainBossKillBonus();
                        }
                        
                        // 생명력 흡수
                        if (this.player.lifesteal > 0) {
                            this.player.health = Math.min(this.player.maxHealth, 
                                this.player.health + this.player.lifesteal);
                        }
                    }
                }
            });
        });
        
        // Player vs Enemy
        this.enemies.forEach(enemy => {
            if (this.isColliding(this.player, enemy)) {
                // 일반 몬스터는 물리 데미지, 보스는 마법 데미지
                const damageType = enemy.isBoss ? 'magic' : 'physical';
                this.player.takeDamage(enemy.damage, damageType);
                // Don't kill enemy on contact, let them continue attacking
            }
        });
        
        // Player vs Experience Gem
        this.experienceGems.forEach(gem => {
            if (this.isColliding(this.player, gem)) {
                this.player.gainExperience(gem.value);
                gem.dead = true;
            }
        });
        
        // Boss projectiles vs Player
        this.bossProjectiles.forEach(projectile => {
            if (!projectile.dead) {
                const dx = this.player.x - projectile.x;
                const dy = this.player.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.radius + projectile.radius) {
                    // 보스 투사체는 마법 데미지
                    this.player.takeDamage(projectile.damage, 'magic');
                    projectile.dead = true;
                }
            }
        });
    }
    
    isColliding(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }
    
    spawnExperienceGem(x, y, enemy = null) {
        // 개선된 경험치 값 계산
        let baseExpValue = 8; // 기본 경험치 (기존 10에서 8로 조정)
        
        if (enemy) {
            // 1. 적 타입별 경험치
            if (enemy.isBoss) {
                baseExpValue = 100 + (this.bossesKilled * 25); // 보스: 100 + 보스킬수*25
            } else {
                // 특수 웨이브 몬스터들
                if (enemy.color === '#8800ff') { // 엘리트 (보라색)
                    baseExpValue = 25;
                } else if (enemy.color === '#666666') { // 탱커 (회색)
                    baseExpValue = 20;
                } else if (enemy.color === '#00ffff') { // 속도 (청록색)
                    baseExpValue = 15;
                } else if (enemy.color === '#ffcccc') { // 약한 몬스터 (연한 빨간색)
                    baseExpValue = 5;
                } else {
                    // 일반 몬스터: 웨이브 레벨에 따라
                    baseExpValue = 6 + Math.floor(enemy.waveLevel / 2);
                }
            }
            
            // 2. 점수 기반 경험치 보너스 (높은 점수일수록 더 많은 경험치)
            const scoreBonus = Math.floor(this.score / 5000); // 점수 5000당 +1 경험치
            baseExpValue += scoreBonus;
            
            // 3. 생존 시간 보너스 (오래 버틸수록 더 많은 경험치)
            const timeBonus = Math.floor(this.survivalTime / 60000); // 1분당 +1 경험치
            baseExpValue += timeBonus;
        }
        
        this.experienceGems.push(new ExperienceGem(x, y, baseExpValue));
    }
    
    cleanup() {
        this.enemies = this.enemies.filter(enemy => !enemy.dead);
        this.projectiles = this.projectiles.filter(projectile => !projectile.dead);
        this.experienceGems = this.experienceGems.filter(gem => !gem.dead);
        this.bossProjectiles = this.bossProjectiles.filter(projectile => !projectile.dead);
    }
    
    updateTimer() {
        const remainingTime = Math.max(0, this.maxGameTime - this.gameTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        document.getElementById('timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateScore() {
        document.getElementById('score-text').textContent = `점수: ${this.score}`;
        document.getElementById('boss-counter').textContent = `보스 처치: ${this.bossesKilled}`;
    }
    
    addScore(points) {
        this.score += points;
        this.updateScore();
        
        // 보스 소환 체크
        if (this.score >= this.nextBossScore) {
            this.spawnBoss();
            this.nextBossScore += 50;
        }
    }
    
    spawnBoss() {
        const bossNumber = Math.min(10, this.bossesKilled + 1);
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        // 보스는 플레이어 주변 더 먼 거리에서 스폰
        const bossSpawnDistance = 300;
        
        switch (side) {
            case 0: // Top
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y - bossSpawnDistance;
                break;
            case 1: // Right
                x = this.player.x + bossSpawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
            case 2: // Bottom
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y + bossSpawnDistance;
                break;
            case 3: // Left
                x = this.player.x - bossSpawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
        }
        
        // 통합 난이도 기반 보스 생성
        const adjustedWaveLevel = Math.floor(this.waveLevel * this.difficultyIndex);
        const boss = new Boss(x, y, bossNumber, adjustedWaveLevel);
        this.enemies.push(boss);
        this.currentBossColor = boss.color; // 보스 색상을 현재 웨이브 색상으로 설정
        
        // 보스 생성 카운터 증가
        this.totalBossesSpawned++;
        
        console.log(`보스 ${bossNumber} 출현: ${boss.name}! (웨이브 ${this.waveLevel}→${adjustedWaveLevel}, 체력: ${boss.health}, 난이도: ${this.difficultyIndex.toFixed(2)})`);
    }
    
    updateAdaptiveDifficulty(deltaTime) {
        this.survivalTime += deltaTime;
        
        // 5초마다 DPS 계산 및 난이도 조정
        if (this.survivalTime - this.lastDPSCheck >= this.dpsCheckInterval) {
            this.calculateDPS();
            this.adjustDifficulty();
            this.lastDPSCheck = this.survivalTime;
        }
    }
    
    calculateDPS() {
        const timeElapsed = (this.survivalTime - this.lastDPSCheck) / 1000; // 초 단위
        if (timeElapsed > 0) {
            this.currentDPS = this.totalDamageDealt / (this.survivalTime / 1000);
            console.log(`현재 DPS: ${this.currentDPS.toFixed(1)}, 생존 시간: ${(this.survivalTime/1000).toFixed(1)}초`);
        }
    }
    
    adjustDifficulty() {
        const baselineDPS = 15 + (this.waveLevel - 1) * 5; // 웨이브별 기준 DPS
        const dpsRatio = this.currentDPS / baselineDPS;
        
        // DPS가 기준보다 높으면 난이도 증가
        if (dpsRatio > 1.5) {
            this.difficultyMultiplier = Math.min(3.0, this.difficultyMultiplier * 1.1);
        } else if (dpsRatio < 0.7) {
            this.difficultyMultiplier = Math.max(0.5, this.difficultyMultiplier * 0.95);
        }
        
        console.log(`난이도 배율: ${this.difficultyMultiplier.toFixed(2)} (DPS 비율: ${dpsRatio.toFixed(2)})`);
    }
    
    recordDamage(damage) {
        this.totalDamageDealt += damage;
    }
    
    showGameOverScreen() {
        const modal = document.getElementById('game-over-modal');
        const finalTime = Math.floor(this.survivalTime / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-time').textContent = `${minutes}분 ${seconds}초`;
        document.getElementById('final-level').textContent = this.player.level;
        document.getElementById('final-bosses').textContent = this.bossesKilled;
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log(`게임 오버! 점수: ${this.score}, 생존시간: ${minutes}분 ${seconds}초`);
    }
    
    updateCamera() {
        // 플레이어를 중심으로 카메라 이동
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
    }
    
    isVisibleOnScreen(obj) {
        const margin = 100; // 화면 밖 여유분
        const screenLeft = this.camera.x - this.canvas.width / 2 - margin;
        const screenRight = this.camera.x + this.canvas.width / 2 + margin;
        const screenTop = this.camera.y - this.canvas.height / 2 - margin;
        const screenBottom = this.camera.y + this.canvas.height / 2 + margin;
        
        return obj.x >= screenLeft && obj.x <= screenRight && 
               obj.y >= screenTop && obj.y <= screenBottom;
    }
    
    renderBackground() {
        // 격자 무늬 배경 그리기
        const gridSize = 100;
        const startX = Math.floor((this.camera.x - this.canvas.width / 2) / gridSize) * gridSize;
        const endX = Math.ceil((this.camera.x + this.canvas.width / 2) / gridSize) * gridSize;
        const startY = Math.floor((this.camera.y - this.canvas.height / 2) / gridSize) * gridSize;
        const endY = Math.ceil((this.camera.y + this.canvas.height / 2) / gridSize) * gridSize;
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        
        // 세로선 그리기
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // 가로선 그리기
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    createChainLightning(sourceEnemy, damage, chainsRemaining) {
        if (chainsRemaining <= 0) return;
        
        // 근처 적들을 찾음 (200 거리 이내)
        const chainRange = 200;
        const nearbyEnemies = this.enemies.filter(enemy => {
            if (enemy === sourceEnemy || enemy.dead) return false;
            const dx = enemy.x - sourceEnemy.x;
            const dy = enemy.y - sourceEnemy.y;
            return Math.sqrt(dx * dx + dy * dy) <= chainRange;
        });
        
        if (nearbyEnemies.length === 0) return;
        
        // 가장 가까운 적을 선택
        const target = nearbyEnemies[0];
        
        // 연쇄 번개 시각 효과 (선택사항)
        this.createLightningEffect(sourceEnemy.x, sourceEnemy.y, target.x, target.y);
        
        // 데미지 적용
        let actualDamage = damage;
        if (target.isBoss && target.damageReduction) {
            actualDamage = Math.max(1, actualDamage * (1 - target.damageReduction));
        }
        
        target.takeDamage(actualDamage);
        this.recordDamage(actualDamage);
        
        // 재귀적으로 다음 연쇄 실행 (데미지 감소)
        setTimeout(() => {
            this.createChainLightning(target, damage * 0.8, chainsRemaining - 1);
        }, 100); // 0.1초 지연
    }
    
    createLightningEffect(x1, y1, x2, y2) {
        // 번개 효과를 위한 임시 객체 생성
        const effect = {
            x1, y1, x2, y2,
            duration: 200,
            timeLeft: 200,
            render: function(ctx) {
                if (this.timeLeft <= 0) return;
                
                ctx.save();
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.globalAlpha = this.timeLeft / this.duration;
                
                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);
                
                // 지그재그 효과
                const segments = 5;
                for (let i = 1; i <= segments; i++) {
                    const progress = i / segments;
                    const x = this.x1 + (this.x2 - this.x1) * progress;
                    const y = this.y1 + (this.y2 - this.y1) * progress;
                    const offset = (Math.random() - 0.5) * 20;
                    
                    ctx.lineTo(x + offset, y + offset);
                }
                ctx.lineTo(this.x2, this.y2);
                ctx.stroke();
                
                ctx.restore();
            }
        };
        
        // 임시 효과 배열에 추가 (없다면 생성)
        if (!this.visualEffects) this.visualEffects = [];
        this.visualEffects.push(effect);
        
        // 일정 시간 후 제거
        setTimeout(() => {
            const index = this.visualEffects.indexOf(effect);
            if (index > -1) this.visualEffects.splice(index, 1);
        }, effect.duration);
    }
    
    applyProjectileEffects(projectile, enemy, damage) {
        const effects = projectile.effects;
        
        // 화염 효과 - 화상 DOT 적용
        if (effects.fire) {
            if (!enemy.statusEffects) enemy.statusEffects = {};
            enemy.statusEffects.burning = {
                damage: damage * 0.2, // 20% 추가 데미지
                duration: 3000,       // 3초간
                interval: 500,        // 0.5초마다
                lastTick: Date.now()
            };
        }
        
        // 빙결 효과 - 이동속도 감소
        if (effects.frost) {
            if (!enemy.statusEffects) enemy.statusEffects = {};
            enemy.statusEffects.frozen = {
                slowAmount: 0.5,      // 50% 속도 감소
                duration: 2000,       // 2초간
                startTime: Date.now()
            };
        }
        
        // 독 효과 - 독 DOT 적용
        if (effects.poison) {
            if (!enemy.statusEffects) enemy.statusEffects = {};
            enemy.statusEffects.poisoned = {
                damage: damage * 0.15, // 15% 추가 데미지
                duration: 5000,        // 5초간
                interval: 1000,        // 1초마다
                lastTick: Date.now()
            };
        }
    }
    
    createExplosion(x, y, damage, radius) {
        // 폭발 범위 내 모든 적에게 데미지
        this.enemies.forEach(enemy => {
            if (enemy.dead) return;
            
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                let explosionDamage = damage * (1 - distance / radius); // 거리에 따라 데미지 감소
                
                // 보스 방어력 적용
                if (enemy.isBoss && enemy.damageReduction) {
                    explosionDamage = Math.max(1, explosionDamage * (1 - enemy.damageReduction));
                }
                
                enemy.takeDamage(explosionDamage);
                this.recordDamage(explosionDamage);
            }
        });
        
        // 폭발 시각 효과
        this.createExplosionEffect(x, y, radius);
    }
    
    createExplosionEffect(x, y, radius) {
        const effect = {
            x, y, radius,
            duration: 300,
            timeLeft: 300,
            render: function(ctx) {
                if (this.timeLeft <= 0) return;
                
                ctx.save();
                ctx.fillStyle = '#ff6600';
                ctx.globalAlpha = this.timeLeft / this.duration;
                
                const currentRadius = this.radius * (1 - this.timeLeft / this.duration);
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        };
        
        if (!this.visualEffects) this.visualEffects = [];
        this.visualEffects.push(effect);
        
        setTimeout(() => {
            const index = this.visualEffects.indexOf(effect);
            if (index > -1) this.visualEffects.splice(index, 1);
        }, effect.duration);
    }
}

class Player {
    constructor(x, y, game = null) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.radius = 15;
        this.speed = 200;
        this.health = 100;
        this.maxHealth = 100;
        this.experience = 0;
        this.experienceToNextLevel = 50;
        this.level = 1;
        console.log('Player initialized - XP:', this.experience, 'Next level:', this.experienceToNextLevel);
        this.lastAttackTime = 0;
        this.attackCooldown = 300; // 0.3초 기본 공격 쿨다운
        this.weapons = ['basicWand'];
        this.lastHitTime = 0;
        this.invulnerabilityDuration = 1000; // 1 second invulnerability
        this.baseDamage = 12; // 기본 데미지 증가
        
        // 스킬 시스템 추가
        this.skillCooldown = 3000; // 3초 스킬 쿨다운
        this.lastSkillTime = 0;
        this.skillDamage = 20; // 스킬 기본 데미지
        this.skillRadius = 80; // 스킬 범위
        
        // 스킬 스탯 초기화
        this.defense = 0;
        this.expMultiplier = 1;
        this.projectileCount = 1;
        this.healthRegen = 0;
        this.pierceCount = 0;
        this.critChance = 0;
        this.critMultiplier = 2.0;
        this.lifesteal = 0;
        this.projectileSize = 1.0;
        this.attackRange = 1.0;
        this.magicResistance = 0;
        this.physicalResistance = 0;
        this.expCollectRange = 1.0;
        
        // 대시 시스템
        this.dashCooldown = 3000; // 3초 쿨다운
        this.lastDashTime = 0;
        this.isDashing = false;
        this.dashDuration = 200; // 0.2초간 대시
        this.dashSpeed = 800; // 대시 속도
        this.dashDirection = { x: 0, y: 0 };
        
        this.acquiredSkills = new Set(); // 획득한 스킬 추적
        this.stackableSkills = new Set(['health', 'speed', 'damage', 'attackSpeed', 'healSmall', 'defense', 
            'expBonus', 'projectiles', 'regen', 'pierce', 'critChance', 'healthLarge', 'speedLarge', 
            'attackSpeedLarge', 'damageLarge', 'multiProjectiles', 'critChanceLarge', 'pierceLarge', 
            'lifesteal', 'fastRegen', 'critDamage', 'healthMassive', 'speedMassive', 'attackSpeedMassive', 
            'damageMassive', 'projectileStorm', 'critMaster', 'lifestealLarge', 'defenseMassive', 'superRegen']); // 중첩 가능한 스킬들
    }
    
    update(deltaTime, keys) {
        const currentTime = Date.now();
        
        // 대시 처리
        if (keys['Space'] && currentTime - this.lastDashTime >= this.dashCooldown && !this.isDashing) {
            this.startDash(keys);
        }
        
        if (this.isDashing) {
            // 대시 중일 때
            const dashMoveSpeed = this.dashSpeed * deltaTime / 1000;
            this.x += this.dashDirection.x * dashMoveSpeed;
            this.y += this.dashDirection.y * dashMoveSpeed;
            
            if (currentTime - this.lastDashTime >= this.dashDuration) {
                this.isDashing = false;
            }
        } else {
            // 일반 이동
            const moveSpeed = this.speed * deltaTime / 1000;
            
            if (keys['KeyW'] || keys['ArrowUp']) this.y -= moveSpeed;
            if (keys['KeyS'] || keys['ArrowDown']) this.y += moveSpeed;
            if (keys['KeyA'] || keys['ArrowLeft']) this.x -= moveSpeed;
            if (keys['KeyD'] || keys['ArrowRight']) this.x += moveSpeed;
        }
        
        // 무한 맵: 경계 제한 제거
        // 플레이어는 이제 어디든 이동 가능
        
        // 체력 재생 적용
        if (this.healthRegen > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.healthRegen * deltaTime / 1000);
        }
        
        this.updateUI();
    }
    
    // 마우스 타겟으로 발사체 발사 (좌클릭)
    fireProjectileToTarget(targetX, targetY, game) {
        console.log('fireProjectileToTarget 호출됨:', targetX, targetY);
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime < this.attackCooldown) {
            console.log('쿨다운 중:', currentTime - this.lastAttackTime, 'ms');
            return;
        }
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 사거리 체크
        const maxRange = 400 * this.attackRange;
        if (distance > maxRange) {
            console.log('사거리 밖:', distance, '>', maxRange);
            return;
        }
        
        console.log('발사체 생성 중...');
        const angle = Math.atan2(dy, dx);
        
        // 다중 투사체 생성
        for (let i = 0; i < this.projectileCount; i++) {
            let projectileAngle = angle;
            
            // 투사체가 여러 개일 때 각도 분산
            if (this.projectileCount > 1) {
                const spreadAngle = 0.3;
                const angleOffset = (i - (this.projectileCount - 1) / 2) * spreadAngle / (this.projectileCount - 1);
                projectileAngle += angleOffset;
            }
            
            // 치명타 계산
            const isCrit = Math.random() * 100 < this.critChance;
            const damage = isCrit ? this.baseDamage * this.critMultiplier : this.baseDamage;
            
            // 특수 효과 (좌클릭 기본 공격도 기본 효과 추가)
            const effects = {
                fire: this.fireProjectiles || true, // 기본 화염 효과 추가
                frost: this.frostProjectiles || false,
                poison: this.poisonProjectiles || false,
                explosive: this.explosiveProjectiles || false
            };
            console.log('좌클릭 투사체 효과:', effects);
            
            console.log('투사체 생성:', this.x, this.y, projectileAngle, damage);
            game.projectiles.push(new Projectile(this.x, this.y, projectileAngle, damage, 0, isCrit, this.projectileSize, effects)); // 기본 공격은 관통력 0
        }
        
        console.log('공격 완료, 투사체 수:', game.projectiles.length);
        this.lastAttackTime = currentTime;
    }
    
    // 스킬 사용 가능 여부 체크
    canUseSkill() {
        const currentTime = Date.now();
        return currentTime - this.lastSkillTime >= this.skillCooldown;
    }
    
    // 범위 스킬 사용 (우클릭)
    useAreaSkill(targetX, targetY, game) {
        const currentTime = Date.now();
        this.lastSkillTime = currentTime;
        
        // 8방향으로 발사체 발사
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            
            // 치명타 계산 (스킬은 치명타 확률 1.5배)
            const isCrit = Math.random() * 100 < (this.critChance * 1.5);
            const damage = isCrit ? this.skillDamage * this.critMultiplier : this.skillDamage;
            
            // 스킬 투사체는 더 큰 크기와 관통력
            const skillEffects = {
                fire: true, // 스킬은 항상 화염 효과
                frost: this.frostProjectiles || false,
                poison: this.poisonProjectiles || false,
                explosive: true // 스킬은 항상 폭발 효과
            };
            
            game.projectiles.push(new Projectile(
                this.x, this.y, angle, damage, 
                this.pierceCount + 2, // 기본 관통력 +2
                isCrit, 
                this.projectileSize * 1.5, // 1.5배 크기
                skillEffects
            ));
        }
    }
    
    startDash(keys) {
        let dx = 0, dy = 0;
        
        // 입력된 방향 계산
        if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
        if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
        
        // 방향이 없으면 위쪽으로 기본 대시
        if (dx === 0 && dy === 0) dy = -1;
        
        // 방향 정규화
        const length = Math.sqrt(dx * dx + dy * dy);
        this.dashDirection.x = dx / length;
        this.dashDirection.y = dy / length;
        
        this.isDashing = true;
        this.lastDashTime = Date.now();
    }
    
    render(ctx) {
        const currentTime = Date.now();
        const isInvulnerable = currentTime - this.lastHitTime < this.invulnerabilityDuration;
        
        if (this.isDashing) {
            // 대시 중일 때 반투명하고 빠르게 깜빡임
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
        } else if (isInvulnerable && Math.floor(currentTime / 100) % 2 === 0) {
            ctx.fillStyle = '#8888ff'; // Lighter blue when invulnerable
        } else {
            ctx.fillStyle = '#4444ff';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 대시 효과 리셋
        if (this.isDashing) {
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }
    }
    
    autoAttack(deltaTime, enemies, projectiles) {
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime >= this.attackCooldown && enemies.length > 0) {
            const closestEnemy = this.findClosestEnemy(enemies);
            if (closestEnemy) {
                // 사거리 체크
                const dx = closestEnemy.x - this.x;
                const dy = closestEnemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxRange = 300 * this.attackRange; // 기본 사거리 300에 배율 적용
                
                if (distance > maxRange) {
                    return; // 사거리 밖이면 공격하지 않음
                }
                const baseAngle = Math.atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
                
                // 다중 투사체 생성
                for (let i = 0; i < this.projectileCount; i++) {
                    let angle = baseAngle;
                    
                    // 투사체가 여러 개일 때 각도 분산
                    if (this.projectileCount > 1) {
                        const spreadAngle = 0.3; // 약 17도 분산
                        const angleOffset = (i - (this.projectileCount - 1) / 2) * spreadAngle / (this.projectileCount - 1);
                        angle += angleOffset;
                    }
                    
                    // 치명타 계산
                    const isCrit = Math.random() * 100 < this.critChance;
                    const damage = isCrit ? this.baseDamage * this.critMultiplier : this.baseDamage;
                    
                    // 특수 효과 객체 생성
                    const effects = {
                        fire: this.fireProjectiles || false,
                        frost: this.frostProjectiles || false,
                        poison: this.poisonProjectiles || false,
                        explosive: this.explosiveProjectiles || false
                    };
                    
                    projectiles.push(new Projectile(this.x, this.y, angle, damage, this.pierceCount, isCrit, this.projectileSize, effects));
                }
                
                this.lastAttackTime = currentTime;
            }
        }
    }
    
    findClosestEnemy(enemies) {
        let closest = null;
        let closestDistance = Infinity;
        
        enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = enemy;
            }
        });
        
        return closest;
    }
    
    takeDamage(damage, damageType = 'physical') {
        const currentTime = Date.now();
        if (currentTime - this.lastHitTime >= this.invulnerabilityDuration && !this.isDashing) {
            let finalDamage = damage;
            
            // 데미지 타입별 저항력 적용
            if (damageType === 'magic' && this.magicResistance > 0) {
                finalDamage *= (1 - Math.min(0.9, this.magicResistance / 100)); // 최대 90% 저항
            } else if (damageType === 'physical' && this.physicalResistance > 0) {
                finalDamage *= (1 - Math.min(0.9, this.physicalResistance / 100)); // 최대 90% 저항
            }
            
            // 방어력 적용
            const actualDamage = Math.max(1, finalDamage - this.defense);
            this.health = Math.max(0, this.health - actualDamage);
            this.lastHitTime = currentTime;
            console.log(`Player took ${actualDamage} ${damageType} damage (${damage} - ${this.defense} def - resist) Health: ${this.health}`);
        }
    }
    
    gainExperience(amount) {
        const actualAmount = Math.floor(amount * this.expMultiplier);
        console.log('Gain XP:', actualAmount, '(', amount, 'x', this.expMultiplier, ') Current XP:', this.experience, 'Next level:', this.experienceToNextLevel);
        this.experience += actualAmount;
        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
        this.updateUI();
    }
    
    levelUp() {
        this.level++;
        this.experience = 0; // Reset experience to 0 instead of subtracting
        
        // 개선된 레벨링 시스템: 점수와 보스 고려
        this.experienceToNextLevel = this.calculateNextLevelRequirement();
        
        console.log('Level up!', this.level, 'Next level XP:', this.experienceToNextLevel);
        this.showLevelUpModal();
    }
    
    calculateNextLevelRequirement() {
        // 기본 XP 요구량 (레벨별)
        let baseRequirement;
        if (this.level <= 5) {
            baseRequirement = 40 + (this.level - 1) * 20; // 40, 60, 80, 100, 120
        } else if (this.level <= 10) {
            baseRequirement = 120 + (this.level - 5) * 30; // 150, 180, 210, 240, 270
        } else if (this.level <= 15) {
            baseRequirement = 270 + (this.level - 10) * 40; // 310, 350, 390, 430, 470
        } else {
            baseRequirement = 470 + (this.level - 15) * 50; // 520, 570, 620...
        }
        
        // 게임 점수에 따른 조정 (점수가 높을수록 레벨업 빨라짐)
        const game = this.game;
        if (game) {
            const scoreMultiplier = Math.max(0.7, 1 - (game.score / 10000) * 0.3); // 점수 10000당 30% 감소, 최소 70%
            baseRequirement = Math.floor(baseRequirement * scoreMultiplier);
        }
        
        return baseRequirement;
    }
    
    gainBossKillBonus() {
        // 보스 처치 시 추가 레벨업 도움
        const bonusExp = Math.floor(this.experienceToNextLevel * 0.3); // 필요 경험치의 30% 보너스
        console.log(`🎯 보스 킬 보너스: +${bonusExp} XP`);
        this.gainExperience(bonusExp);
    }
    
    showLevelUpModal() {
        const modal = document.getElementById('level-up-modal');
        const skillSelectionScreen = document.getElementById('skill-selection-screen');
        const skillConfirmationScreen = document.getElementById('skill-confirmation-screen');
        const choices = document.getElementById('level-up-choices');
        const currentLevelDisplay = document.getElementById('current-level');
        
        // Pause the game completely
        if (this.game) {
            this.game.isPaused = true;
        }
        
        // Update current level display
        if (currentLevelDisplay) {
            currentLevelDisplay.textContent = this.level;
        }
        
        // Show skill selection screen, hide confirmation screen
        skillSelectionScreen.classList.remove('hidden');
        skillConfirmationScreen.classList.add('hidden');
        
        choices.innerHTML = '';
        
        // Generate 3 unique random choices
        const selectedChoices = [];
        const maxAttempts = 50; // 무한루프 방지
        
        for (let i = 0; i < 3; i++) {
            let attempts = 0;
            let choice;
            
            do {
                choice = this.generateLevelUpChoice();
                attempts++;
            } while (
                attempts < maxAttempts && 
                (selectedChoices.some(c => c.type === choice.type) || // 이번 선택지에 중복
                (this.acquiredSkills.has(choice.type) && !this.stackableSkills.has(choice.type))) // 이미 획득한 스킬 (중첩 불가능한 것만)
            );
            
            if (attempts >= maxAttempts) {
                // 더 이상 새로운 스킬이 없으면 기본 스킬들로 대체
                const fallbackSkills = [
                    { name: '체력 증강', description: '최대 체력 +20', type: 'health_' + Date.now(), rarity: 'common', icon: '❤️', stats: 'HP +20' },
                    { name: '공격력 증강', description: '공격력 +5', type: 'damage_' + Date.now(), rarity: 'common', icon: '⚔️', stats: 'ATK +5' },
                    { name: '이동 속도 증가', description: '이동 속도 +10%', type: 'speed_' + Date.now(), rarity: 'common', icon: '💨', stats: 'SPD +10%' }
                ];
                choice = fallbackSkills[i] || fallbackSkills[0];
            }
            
            selectedChoices.push(choice);
            
            const button = document.createElement('button');
            button.className = `choice-button ${choice.rarity}`;
            
            const rarityText = {
                'common': '일반',
                'rare': '레어',
                'epic': '희귀',
                'legendary': '전설'
            };
            
            // 스킬 아이콘 설정
            const skillIcon = this.getSkillIcon(choice.type) || choice.icon || '🔹';
            const skillStats = this.getSkillStats(choice) || choice.stats || '';
            
            button.innerHTML = `
                <div class="skill-icon-small">${skillIcon}</div>
                <div class="skill-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>${choice.name}</strong>
                        <span style="font-size: 0.8em; opacity: 0.8;">[${rarityText[choice.rarity]}]</span>
                    </div>
                    <div style="font-size: 0.9em; opacity: 0.9;">${skillStats}</div>
                    <div style="font-size: 0.8em; margin-top: 5px;">${choice.description}</div>
                </div>
            `;
            
            // 첫 번째 단계: 스킬 선택
            button.onclick = () => {
                this.showSkillConfirmation(choice);
            };
            
            choices.appendChild(button);
        }
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    
    getRandomRarity() {
        const rand = Math.random() * 100;
        if (rand < 70) return 'common';      // 70% 일반
        if (rand < 90) return 'rare';        // 20% 레어
        if (rand < 97) return 'epic';        // 7% 희귀
        return 'legendary';                  // 3% 전설
    }
    
    generateLevelUpChoice() {
        const choices = {
            common: [
                { name: '체력 증강', description: '최대 체력을 증가시켜 생존력을 향상시킵니다', type: 'health', rarity: 'common', icon: '❤️', stats: 'HP +15' },
                { name: '이동 속도 증가', description: '이동 속도를 높여 기동성을 향상시킵니다', type: 'speed', rarity: 'common', icon: '💨', stats: 'SPD +8%' },
                { name: '공격력 증강', description: '기본 공격력을 증가시켜 더 강한 피해를 줍니다', type: 'damage', rarity: 'common', icon: '⚔️', stats: 'ATK +2' },
                { name: '공격 속도 증가', description: '공격 쿨타임을 줄여 연사력을 향상시킵니다', type: 'attackSpeed', rarity: 'common', icon: '🔥', stats: 'AS +5%' },
                { name: '체력 회복', description: '즉시 체력을 회복합니다', type: 'healSmall', rarity: 'common', icon: '💚', stats: 'HP회복 +30' },
                { name: '방어력 증가', description: '받는 모든 피해를 줄입니다', type: 'defense', rarity: 'common', icon: '🛡️', stats: 'DEF +1' },
                { name: '경험치 획득량 증가', description: '적을 처치할 때 더 많은 경험치를 얻습니다', type: 'expBonus', rarity: 'common', icon: '⭐', stats: 'EXP +20%' },
                { name: '투사체 수 증가', description: '한 번에 발사하는 투사체 수를 늘립니다', type: 'projectiles', rarity: 'common', icon: '🎯', stats: '투사체 +1' },
                { name: '생명력 재생', description: '시간이 지나면 체력이 자동으로 회복됩니다', type: 'regen', rarity: 'common', icon: '🌿', stats: 'HP재생 +1/s' },
                { name: '마법 저항력', description: '마법 계열 공격으로부터 받는 피해를 줄입니다', type: 'magicRes', rarity: 'common', icon: '🔮', stats: '마법저항 +20%' },
                { name: '물리 저항력', description: '물리 계열 공격으로부터 받는 피해를 줄입니다', type: 'physRes', rarity: 'common', icon: '⚪', stats: '물리저항 +20%' },
                { name: '투사체 관통', description: '투사체가 적을 관통하여 지나갑니다', type: 'pierce', rarity: 'common', icon: '🏹', stats: '관통 +1' },
                { name: '사거리 증가', description: '공격 사거리를 늘려 더 멀리서 공격할 수 있습니다', type: 'range', rarity: 'common', icon: '📏', stats: '사거리 +20%' },
                { name: '투사체 크기 증가', description: '투사체 크기를 늘려 명중률을 향상시킵니다', type: 'projectileSize', rarity: 'common', icon: '⭕', stats: '크기 +20%' },
                { name: '치명타 확률', description: '치명타 공격 확률을 증가시킵니다', type: 'critChance', rarity: 'common', icon: '💥', stats: '치명타 +5%' },
            ],
            rare: [
                { name: '강화된 체력', description: '최대 체력 +50', type: 'healthLarge', rarity: 'rare' },
                { name: '신속한 발걸음', description: '이동 속도 +25%', type: 'speedLarge', rarity: 'rare' },
                { name: '연사 모드', description: '공격 쿨타임 -30%', type: 'attackSpeedLarge', rarity: 'rare' },
                { name: '강력한 일격', description: '공격력 +15', type: 'damageLarge', rarity: 'rare' },
                { name: '완전 회복', description: '체력 완전 회복', type: 'heal', rarity: 'rare' },
                { name: '다중 투사체', description: '투사체 +2개', type: 'multiProjectiles', rarity: 'rare' },
                { name: '높은 치명타율', description: '치명타 확률 +15%', type: 'critChanceLarge', rarity: 'rare' },
                { name: '강화된 관통', description: '투사체가 적 3체 관통', type: 'pierceLarge', rarity: 'rare' },
                { name: '생명력 흡수', description: '적 처치 시 체력 +5', type: 'lifesteal', rarity: 'rare' },
                { name: '마법 방패', description: '마법 데미지 -50%', type: 'magicShield', rarity: 'rare' },
                { name: '강철 갑옷', description: '물리 데미지 -50%', type: 'physShield', rarity: 'rare' },
                { name: '폭발 투사체', description: '투사체가 폭발하여 주변 피해', type: 'explosive', rarity: 'rare' },
                { name: '빠른 재생', description: '초당 체력 +3', type: 'fastRegen', rarity: 'rare' },
                { name: '치명타 피해 증가', description: '치명타 피해 +50%', type: 'critDamage', rarity: 'rare' },
                { name: '경험치 자석', description: '경험치 수집 범위 +100%', type: 'expRange', rarity: 'rare' },
            ],
            epic: [
                { name: '거대한 체력', description: '최대 체력 +100', type: 'healthMassive', rarity: 'epic' },
                { name: '순간이동', description: '이동 속도 +50%', type: 'speedMassive', rarity: 'epic' },
                { name: '기관총 모드', description: '공격 쿨타임 -50%', type: 'attackSpeedMassive', rarity: 'epic' },
                { name: '파괴적인 힘', description: '공격력 +30', type: 'damageMassive', rarity: 'epic' },
                { name: '투사체 폭풍', description: '투사체 +5개', type: 'projectileStorm', rarity: 'epic' },
                { name: '완벽한 관통', description: '투사체가 모든 적 관통', type: 'piercePerfect', rarity: 'epic' },
                { name: '치명타 마스터', description: '치명타 확률 +30%', type: 'critMaster', rarity: 'epic' },
                { name: '생명력 흡혈', description: '적 처치 시 체력 +15', type: 'lifestealLarge', rarity: 'epic' },
                { name: '무적의 방어', description: '받는 데미지 -5', type: 'defenseMassive', rarity: 'epic' },
                { name: '초고속 재생', description: '초당 체력 +10', type: 'superRegen', rarity: 'epic' },
                { name: '연쇄 번개', description: '투사체가 적을 연쇄 공격', type: 'chain', rarity: 'epic' },
                { name: '냉기 투사체', description: '적을 50% 감속시킴', type: 'frost', rarity: 'epic' },
                { name: '화염 투사체', description: '적에게 지속 피해', type: 'fire', rarity: 'epic' },
                { name: '독 투사체', description: '적을 중독시켜 지속 피해', type: 'poison', rarity: 'epic' },
                { name: '경험치 폭발', description: '경험치 획득량 +100%', type: 'expBomb', rarity: 'epic' },
            ],
            legendary: [
                { name: '불멸의 생명력', description: '최대 체력 +50, 초당 체력 +5', type: 'immortal', rarity: 'legendary' },
                { name: '시간 가속', description: '이동속도 +100%, 공격속도 +100%', type: 'timeAccel', rarity: 'legendary' },
                { name: '파멸의 힘', description: '공격력 +100, 치명타 확률 +50%', type: 'destruction', rarity: 'legendary' },
                { name: '무한 투사체', description: '투사체 +10개, 모든 적 관통', type: 'infinite', rarity: 'legendary' },
                { name: '절대 방어', description: '받는 데미지 -90%', type: 'absoluteDefense', rarity: 'legendary' },
            ]
        };
        
        const rarity = this.getRandomRarity();
        const rarityChoices = choices[rarity];
        return rarityChoices[Math.floor(Math.random() * rarityChoices.length)];
    }
    
    showSkillConfirmation(choice) {
        const skillSelectionScreen = document.getElementById('skill-selection-screen');
        const skillConfirmationScreen = document.getElementById('skill-confirmation-screen');
        const skillInfo = document.getElementById('selected-skill-info');
        
        // Hide selection screen, show confirmation screen
        skillSelectionScreen.classList.add('hidden');
        skillConfirmationScreen.classList.remove('hidden');
        
        // 스킬 상세 정보 표시
        const skillIcon = this.getSkillIcon(choice.type) || choice.icon || '🔹';
        const skillStats = this.getSkillStats(choice) || choice.stats || '';
        const skillType = this.getSkillType(choice.rarity);
        const canUpgrade = this.canUpgradeSkill(choice.type);
        const upgradeCost = this.getUpgradeCost(choice.type);
        
        const rarityText = {
            'common': '일반',
            'rare': '레어', 
            'epic': '희귀',
            'legendary': '전설'
        };
        
        skillInfo.innerHTML = `
            <div class="skill-preview">
                <div class="skill-icon">${skillIcon}</div>
                <div class="skill-details">
                    <div class="skill-name">${choice.name}</div>
                    <div class="skill-type">${skillType} [${rarityText[choice.rarity]}]</div>
                    <div class="skill-stats">${skillStats}</div>
                    <div class="skill-description">${choice.description}</div>
                    ${canUpgrade ? `<div class="upgrade-info">업그레이드 가능 (비용: ${upgradeCost})</div>` : ''}
                </div>
            </div>
        `;
        
        // 확인/취소 버튼 이벤트 설정
        const confirmBtn = document.getElementById('confirm-upgrade');
        const cancelBtn = document.getElementById('cancel-upgrade');
        
        // 기존 이벤트 리스너 제거
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // 새 이벤트 리스너 추가
        newConfirmBtn.onclick = () => {
            this.applyChoice(choice);
            // 중첩 불가능한 스킬만 기록
            if (!this.stackableSkills.has(choice.type)) {
                this.acquiredSkills.add(choice.type);
            }
            this.closeLevelUpModal();
        };
        
        newCancelBtn.onclick = () => {
            // 스킬 선택 화면으로 돌아가기
            skillConfirmationScreen.classList.add('hidden');
            skillSelectionScreen.classList.remove('hidden');
        };
    }
    
    closeLevelUpModal() {
        const modal = document.getElementById('level-up-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Resume game
        if (this.game) {
            this.game.isPaused = false;
        }
    }
    
    getSkillIcon(skillType) {
        const iconMap = {
            'health': '❤️', 'healthLarge': '💖', 'healthMassive': '💗',
            'speed': '💨', 'speedLarge': '🌪️', 'speedMassive': '⚡',
            'damage': '⚔️', 'damageLarge': '🗡️', 'damageMassive': '⚡',
            'attackSpeed': '🔥', 'attackSpeedLarge': '🔥', 'attackSpeedMassive': '⚡',
            'healSmall': '💚', 'heal': '💚',
            'defense': '🛡️', 'defenseMassive': '🛡️',
            'expBonus': '⭐', 'expBomb': '✨',
            'projectiles': '🎯', 'multiProjectiles': '🎯', 'projectileStorm': '🌟',
            'regen': '🌿', 'fastRegen': '🌿', 'superRegen': '🌿',
            'magicRes': '🔮', 'magicShield': '🔮',
            'physRes': '⚪', 'physShield': '⚪',
            'pierce': '🏹', 'pierceLarge': '🏹', 'piercePerfect': '🏹',
            'range': '📏', 'projectileSize': '⭕',
            'critChance': '💥', 'critChanceLarge': '💥', 'critMaster': '💥',
            'lifesteal': '🩸', 'lifestealLarge': '🩸',
            'explosive': '💣', 'chain': '⚡', 'frost': '❄️',
            'fire': '🔥', 'poison': '☠️',
            'immortal': '👑', 'timeAccel': '⏰', 'destruction': '💀',
            'infinite': '♾️', 'absoluteDefense': '🛡️'
        };
        return iconMap[skillType] || '🔹';
    }
    
    getSkillStats(choice) {
        const statsMap = {
            'health': 'HP +15', 'healthLarge': 'HP +50', 'healthMassive': 'HP +100',
            'speed': 'SPD +8%', 'speedLarge': 'SPD +25%', 'speedMassive': 'SPD +50%',
            'damage': 'ATK +2', 'damageLarge': 'ATK +15', 'damageMassive': 'ATK +30',
            'attackSpeed': 'AS +5%', 'attackSpeedLarge': 'AS +30%', 'attackSpeedMassive': 'AS +50%',
            'healSmall': 'HP회복 +30', 'heal': 'HP회복 100%',
            'defense': 'DEF +1', 'defenseMassive': 'DEF +5',
            'expBonus': 'EXP +20%', 'expBomb': 'EXP +100%',
            'projectiles': '투사체 +1', 'multiProjectiles': '투사체 +2', 'projectileStorm': '투사체 +5',
            'regen': 'HP재생 +1/s', 'fastRegen': 'HP재생 +3/s', 'superRegen': 'HP재생 +10/s',
            'critChance': '치명타 +5%', 'critChanceLarge': '치명타 +15%', 'critMaster': '치명타 +30%'
        };
        return statsMap[choice.type] || choice.stats || '';
    }
    
    getSkillType(rarity) {
        const typeMap = {
            'common': '기본 스킬',
            'rare': '고급 스킬',
            'epic': '전문 스킬',
            'legendary': '전설 스킬'
        };
        return typeMap[rarity] || '스킬';
    }
    
    canUpgradeSkill(skillType) {
        // 현재는 모든 스킬이 업그레이드 불가능하다고 가정
        // 나중에 스킬 시스템 확장 시 구현
        return false;
    }
    
    getUpgradeCost(skillType) {
        // 스킬 업그레이드 비용 계산
        return 100; // 기본값
    }

    applyChoice(choice) {
        console.log('Applied choice:', choice.name, choice.type);
        
        // fallback 스킬들 처리
        if (choice.type.startsWith('health_')) {
            this.maxHealth += 15;
            this.health = this.maxHealth;
            this.updateUI();
            return;
        }
        if (choice.type.startsWith('damage_')) {
            this.baseDamage += 2;
            this.updateUI();
            return;
        }
        if (choice.type.startsWith('speed_')) {
            this.speed *= 1.08;
            this.updateUI();
            return;
        }
        
        switch (choice.type) {
            // 일반 등급
            case 'health': this.maxHealth += 15; break;
            case 'speed': this.speed *= 1.08; break;
            case 'damage': this.baseDamage += 2; break;
            case 'attackSpeed': this.attackCooldown *= 0.95; break;
            case 'healSmall': this.health = Math.min(this.maxHealth, this.health + 30); break;
            case 'defense': this.defense = (this.defense || 0) + 1; break;
            case 'expBonus': this.expMultiplier = (this.expMultiplier || 1) * 1.2; break;
            case 'projectiles': this.projectileCount = (this.projectileCount || 1) + 1; break;
            case 'regen': this.healthRegen = (this.healthRegen || 0) + 1; break;
            case 'magicRes': this.magicResistance += 20; break;
            case 'physRes': this.physicalResistance += 20; break;
            case 'pierce': this.pierceCount = (this.pierceCount || 0) + 1; break;
            case 'range': this.attackRange *= 1.2; break;
            case 'projectileSize': this.projectileSize *= 1.2; break;
            case 'critChance': this.critChance = (this.critChance || 0) + 5; break;
            
            // 레어 등급
            case 'healthLarge': this.maxHealth += 30; break;
            case 'speedLarge': this.speed *= 1.15; break;
            case 'attackSpeedLarge': this.attackCooldown *= 0.85; break;
            case 'damageLarge': this.baseDamage += 5; break;
            case 'heal': this.health = this.maxHealth; break;
            case 'multiProjectiles': this.projectileCount = (this.projectileCount || 1) + 2; break;
            case 'critChanceLarge': this.critChance = (this.critChance || 0) + 15; break;
            case 'pierceLarge': this.pierceCount = (this.pierceCount || 0) + 3; break;
            case 'lifesteal': this.lifesteal = (this.lifesteal || 0) + 5; break;
            case 'magicShield': this.magicResistance += 50; break;
            case 'physShield': this.physicalResistance += 50; break;
            case 'explosive': this.explosiveProjectiles = true; break;
            case 'fastRegen': this.healthRegen = (this.healthRegen || 0) + 3; break;
            case 'critDamage': this.critMultiplier = (this.critMultiplier || 1.5) + 0.5; break;
            case 'expRange': this.expCollectRange *= 2; break;
            
            // 희귀 등급
            case 'healthMassive': this.maxHealth += 60; break;
            case 'speedMassive': this.speed *= 1.3; break;
            case 'attackSpeedMassive': this.attackCooldown *= 0.7; break;
            case 'damageMassive': this.baseDamage += 10; break;
            case 'projectileStorm': this.projectileCount = (this.projectileCount || 1) + 5; break;
            case 'piercePerfect': this.pierceCount = 999; break;
            case 'critMaster': this.critChance = (this.critChance || 0) + 30; break;
            case 'lifestealLarge': this.lifesteal = (this.lifesteal || 0) + 15; break;
            case 'defenseMassive': this.defense = (this.defense || 0) + 5; break;
            case 'superRegen': this.healthRegen = (this.healthRegen || 0) + 10; break;
            case 'chain': this.chainLightning = true; break;
            case 'frost': this.frostProjectiles = true; break;
            case 'fire': this.fireProjectiles = true; break;
            case 'poison': this.poisonProjectiles = true; break;
            case 'expBomb': this.expMultiplier = (this.expMultiplier || 1) * 2; break;
            
            // 전설 등급
            case 'immortal': 
                this.maxHealth += 50;  // 100 -> 50으로 감소
                this.healthRegen = (this.healthRegen || 0) + 5;  // 15 -> 5로 감소
                break;
            case 'timeAccel': 
                this.speed *= 1.5; 
                this.attackCooldown *= 0.6; 
                break;
            case 'destruction': 
                this.baseDamage += 15; 
                this.critChance = (this.critChance || 0) + 25; 
                break;
            case 'infinite': 
                this.projectileCount = (this.projectileCount || 1) + 10; 
                this.pierceCount = 999; 
                break;
            case 'absoluteDefense': 
                this.defense = (this.defense || 0) + 90; 
                break;
        }
        
        // 체력 관련 선택지는 현재 체력도 조정
        if (['health', 'healthLarge', 'healthMassive', 'immortal'].includes(choice.type)) {
            this.health = this.maxHealth;
        }
        
        // 스킬 적용 후 UI 업데이트
        this.updateUI();
    }
    
    updateUI() {
        const healthBar = document.querySelector('#health-bar::after');
        const expBar = document.querySelector('#experience-bar::after');
        const levelDisplay = document.getElementById('level-display');
        
        levelDisplay.textContent = `Level ${this.level}`;
        
        // Update health bar
        const healthPercentage = (this.health / this.maxHealth) * 100;
        document.documentElement.style.setProperty('--health-width', `${healthPercentage}%`);
        
        // Update experience bar
        const expPercentage = (this.experience / this.experienceToNextLevel) * 100;
        document.documentElement.style.setProperty('--exp-width', `${expPercentage}%`);
        
        // Update stats display
        const damageElement = document.getElementById('stat-damage');
        const speedElement = document.getElementById('stat-speed');
        const critElement = document.getElementById('stat-crit');
        const defenseElement = document.getElementById('stat-defense');
        const projectilesElement = document.getElementById('stat-projectiles');
        const regenElement = document.getElementById('stat-regen');
        
        if (damageElement) damageElement.textContent = this.baseDamage;
        if (speedElement) speedElement.textContent = Math.round(this.speed);
        if (critElement) critElement.textContent = `${Math.round(this.critChance * 100)}%`;
        if (defenseElement) defenseElement.textContent = this.defense;
        if (projectilesElement) projectilesElement.textContent = this.projectileCount;
        if (regenElement) regenElement.textContent = this.healthRegen.toFixed(1);
    }
}

class Enemy {
    constructor(x, y, waveLevel = 1, color = '#ff4444', difficultyMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.speed = 60 + (waveLevel - 1) * 8; // 초기 속도 감소, 웨이브별 증가량 상승
        
        // 지수적 체력 증가: 기본체력 × 1.4^웨이브 × 난이도배율
        const baseHealth = 30;
        this.health = Math.floor(baseHealth * Math.pow(1.4, waveLevel - 1) * difficultyMultiplier);
        this.maxHealth = this.health;
        
        // 데미지도 지수적 증가하지만 더 완만하게
        const baseDamage = 8;
        this.damage = Math.floor(baseDamage * Math.pow(1.2, waveLevel - 1));
        
        this.dead = false;
        this.scoreValue = waveLevel; // 웨이브 레벨에 비례한 점수
        this.isBoss = false;
        this.color = color;
        this.waveLevel = waveLevel;
    }
    
    update(deltaTime, player, game = null) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            let moveSpeed = this.speed * deltaTime / 1000;
            
            // 빙결 효과 - 이동속도 감소 적용
            if (this.statusEffects && this.statusEffects.frozen) {
                const frozen = this.statusEffects.frozen;
                if (Date.now() - frozen.startTime < frozen.duration) {
                    moveSpeed *= (1 - frozen.slowAmount);
                } else {
                    delete this.statusEffects.frozen;
                }
            }
            
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }
        
        // 일반 적도 탄막 발사 (보스가 아닌 경우)
        if (!this.isBoss && game && distance > 0 && distance < 400) { // 400 거리 이내에서 발사
            this.attemptBulletAttack(player, game, deltaTime);
        }
        
        // 상태 효과 처리
        this.updateStatusEffects(deltaTime);
    }
    
    attemptBulletAttack(player, game, deltaTime) {
        if (!this.lastBulletAttack) this.lastBulletAttack = 0;
        
        const now = Date.now();
        const attackInterval = 2000 + Math.random() * 1000; // 2-3초마다 랜덤
        
        if (now - this.lastBulletAttack >= attackInterval) {
            this.lastBulletAttack = now;
            
            // 탄막 패턴 랜덤 선택
            const patterns = ['single', 'triple', 'circle'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            this.fireBulletPattern(player, game, pattern);
        }
    }
    
    fireBulletPattern(player, game, pattern) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const baseAngle = Math.atan2(dy, dx);
        
        switch (pattern) {
            case 'single':
                // 단일 투사체
                game.bossProjectiles.push({
                    x: this.x,
                    y: this.y,
                    angle: baseAngle,
                    speed: 150,
                    radius: 4,
                    damage: Math.max(3, Math.floor(this.damage * 0.6)),
                    color: '#ff6666',
                    dead: false
                });
                break;
                
            case 'triple':
                // 3방향 투사체
                for (let i = -1; i <= 1; i++) {
                    game.bossProjectiles.push({
                        x: this.x,
                        y: this.y,
                        angle: baseAngle + i * 0.3,
                        speed: 120,
                        radius: 3,
                        damage: Math.max(2, Math.floor(this.damage * 0.4)),
                        color: '#ff8888',
                        dead: false
                    });
                }
                break;
                
            case 'circle':
                // 원형 탄막 (8방향)
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    game.bossProjectiles.push({
                        x: this.x,
                        y: this.y,
                        angle: angle,
                        speed: 100,
                        radius: 3,
                        damage: Math.max(2, Math.floor(this.damage * 0.3)),
                        color: '#ffaa66',
                        dead: false
                    });
                }
                break;
        }
    }
    
    updateStatusEffects(deltaTime) {
        if (!this.statusEffects) return;
        
        const now = Date.now();
        
        // 화상 효과 처리
        if (this.statusEffects.burning) {
            const burning = this.statusEffects.burning;
            if (now - burning.lastTick >= burning.interval) {
                this.takeDamage(burning.damage);
                burning.lastTick = now;
            }
            // 지속시간 체크
            if (now - (burning.lastTick - burning.interval) >= burning.duration) {
                delete this.statusEffects.burning;
            }
        }
        
        // 독 효과 처리
        if (this.statusEffects.poisoned) {
            const poisoned = this.statusEffects.poisoned;
            if (now - poisoned.lastTick >= poisoned.interval) {
                this.takeDamage(poisoned.damage);
                poisoned.lastTick = now;
            }
            // 지속시간 체크
            if (now - (poisoned.lastTick - poisoned.interval) >= poisoned.duration) {
                delete this.statusEffects.poisoned;
            }
        }
        
        // 빙결 효과는 이동 처리에서 이미 체크됨
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const barWidth = this.radius * 2;
        const barHeight = 4;
        const healthPercentage = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth * healthPercentage, barHeight);
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.dead = true;
        }
    }
}

class Projectile {
    constructor(x, y, angle, damage, pierceCount = 0, isCrit = false, sizeMultiplier = 1.0, effects = {}) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 300; // 속도를 줄여서 더 잘 보이게
        this.radius = 8 * sizeMultiplier; // 크기를 크게
        this.damage = damage;
        this.dead = false;
        this.maxDistance = 1000; // 거리 증가
        this.travelDistance = 0;
        console.log('투사체 생성됨:', x, y, 'maxDistance:', this.maxDistance);
        this.pierceCount = pierceCount;
        
        // 특수 효과
        this.effects = effects;
        this.piercesRemaining = pierceCount; // 0이면 한 번만 맞히고 사라짐
        console.log('투사체 관통력:', this.piercesRemaining);
        this.isCrit = isCrit;
        this.hitEnemies = new Set(); // 이미 맞힌 적들을 기록
        this.sizeMultiplier = sizeMultiplier;
    }
    
    update(deltaTime) {
        const moveDistance = this.speed * deltaTime / 1000;
        this.x += Math.cos(this.angle) * moveDistance;
        this.y += Math.sin(this.angle) * moveDistance;
        
        this.travelDistance += moveDistance;
        
        console.log('투사체 업데이트:', this.travelDistance, '/', this.maxDistance, 'deltaTime:', deltaTime);
        
        if (this.travelDistance >= this.maxDistance) {
            console.log('투사체 거리 초과로 제거');
            this.dead = true;
        }
        
        // 무한 맵: 거리 기반 제거 (maxDistance로 이미 처리됨)
        // 캔버스 경계 제거 로직은 무한 맵에서 불필요
    }
    
    render(ctx) {
        if (this.isCrit) {
            // 치명타 투사체는 빨간색으로 더 크게
            ctx.fillStyle = '#ff4444';
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // 특수 효과에 따른 색상 변경
            let color = '#00ffff'; // 기본 시안색 (더 잘 보이게)
            
            if (this.effects.fire) {
                color = '#ff6600'; // 주황색 (화염)
            } else if (this.effects.frost) {
                color = '#00ccff'; // 하늘색 (빙결)
            } else if (this.effects.poison) {
                color = '#66ff00'; // 초록색 (독)
            } else if (this.effects.explosive) {
                color = '#ff9900'; // 황금색 (폭발)
            }
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class ExperienceGem {
    constructor(x, y, value = 8) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.value = value; // 이제 동적으로 설정 가능
        this.dead = false;
        this.collectDistance = 40;
        
        // 경험치 값에 따른 시각적 효과
        if (value >= 100) {
            this.color = '#ffaa00'; // 보스 경험치: 주황색
            this.radius = 12;
        } else if (value >= 25) {
            this.color = '#ff6600'; // 엘리트 경험치: 빨간 주황색
            this.radius = 10;
        } else if (value >= 15) {
            this.color = '#ffff00'; // 고급 경험치: 노란색
            this.radius = 8;
        } else {
            this.color = '#44ff44'; // 일반 경험치: 초록색
            this.radius = 6;
        }
    }
    
    update(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const collectRange = this.collectDistance * player.expCollectRange;
        if (distance < collectRange) {
            const moveSpeed = 300 * deltaTime / 1000;
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }
    }
    
    render(ctx) {
        // 동적 색상 적용
        ctx.fillStyle = this.color;
        
        // 고급 경험치는 반짝이는 효과
        if (this.value >= 25) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 보스 경험치는 테두리 추가
        if (this.value >= 100) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // 효과 리셋
        ctx.shadowBlur = 0;
    }
}

class Boss extends Enemy {
    constructor(x, y, bossNumber, waveLevel = 1) {
        super(x, y, 1);
        this.bossNumber = bossNumber;
        this.waveLevel = waveLevel;
        this.isBoss = true;
        this.setupBossStats();
        this.lastSpecialAttack = 0;
        this.specialAttackCooldown = 2000; // 2초마다 특수 공격 (더 자주)
    }
    
    setupBossStats() {
        const bossConfigs = [
            // Boss 1: 거대한 좀비
            { name: "거대한 좀비", radius: 25, baseHealth: 120, speed: 35, baseDamage: 15, color: "#8B4513", scoreValue: 10 },
            // Boss 2: 독거미 여왕
            { name: "독거미 여왕", radius: 20, baseHealth: 150, speed: 70, baseDamage: 12, color: "#DA70D6", scoreValue: 15 },
            // Boss 3: 화염 골렘
            { name: "화염 골렘", radius: 30, baseHealth: 200, speed: 25, baseDamage: 20, color: "#FF4500", scoreValue: 20 },
            // Boss 4: 얼음 마법사
            { name: "얼음 마법사", radius: 18, baseHealth: 180, speed: 85, baseDamage: 18, color: "#00BFFF", scoreValue: 25 },
            // Boss 5: 네크로맨서
            { name: "네크로맨서", radius: 22, baseHealth: 250, speed: 50, baseDamage: 22, color: "#9932CC", scoreValue: 30 },
            // Boss 6: 용암 드래곤
            { name: "용암 드래곤", radius: 35, baseHealth: 300, speed: 45, baseDamage: 25, color: "#DC143C", scoreValue: 40 },
            // Boss 7: 암흑 기사
            { name: "암흑 기사", radius: 24, baseHealth: 280, speed: 90, baseDamage: 24, color: "#696969", scoreValue: 50 },
            // Boss 8: 크라켄
            { name: "크라켄", radius: 40, baseHealth: 400, speed: 30, baseDamage: 30, color: "#20B2AA", scoreValue: 60 },
            // Boss 9: 리치 킹
            { name: "리치 킹", radius: 28, baseHealth: 500, speed: 65, baseDamage: 35, color: "#9400D3", scoreValue: 80 },
            // Boss 10: 최종 보스 - 어둠의 군주
            { name: "어둠의 군주", radius: 45, baseHealth: 600, speed: 75, baseDamage: 40, color: "#1a1a1a", scoreValue: 100 }
        ];
        
        const config = bossConfigs[this.bossNumber - 1] || bossConfigs[0];
        const gameWaveLevel = this.getGameWaveLevel(); // 게임의 현재 웨이브 레벨
        
        this.name = config.name;
        this.radius = config.radius;
        
        // 보스 체력 지수적 증가: 기본체력 × 1.8^웨이브
        this.health = Math.floor(config.baseHealth * Math.pow(1.8, gameWaveLevel - 1));
        this.maxHealth = this.health;
        
        this.speed = config.speed;
        
        // 보스 데미지도 지수적 증가
        this.damage = Math.floor(config.baseDamage * Math.pow(1.3, gameWaveLevel - 1));
        
        this.color = config.color;
        this.scoreValue = config.scoreValue * gameWaveLevel; // 웨이브에 비례한 점수
        
        // 보스 방어력 추가 (받는 데미지 감소)
        this.damageReduction = Math.min(0.7, 0.2 + (gameWaveLevel - 1) * 0.05); // 최대 70% 감소
    }
    
    getGameWaveLevel() {
        return this.waveLevel;
    }
    
    update(deltaTime, player, game) {
        super.update(deltaTime, player);
        
        // 특수 공격 실행
        const currentTime = Date.now();
        if (currentTime - this.lastSpecialAttack >= this.specialAttackCooldown) {
            this.performSpecialAttack(player, game);
            this.lastSpecialAttack = currentTime;
        }
    }
    
    performSpecialAttack(player, game) {
        switch (this.bossNumber) {
            case 1: // 거대한 좀비 - 주변에 작은 좀비 소환
                this.spawnMinions(game);
                break;
            case 2: // 독거미 여왕 - 독 장판 생성
                this.createPoisonField(game);
                break;
            case 3: // 화염 골렘 - 화염구 발사
                this.shootFireballs(player, game);
                break;
            case 4: // 얼음 마법사 - 플레이어 둔화
                this.castSlowSpell(player);
                break;
            case 5: // 네크로맨서 - 해골 소환
                this.summonSkeletons(game);
                break;
            default:
                // 기본 특수 공격
                this.basicSpecialAttack(player, game);
        }
    }
    
    spawnMinions(game) {
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const distance = this.radius + 30;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            game.enemies.push(new Enemy(x, y, game.waveLevel, this.color));
        }
    }
    
    createPoisonField(game) {
        // 독 필드 효과 (시각적으로는 보이지 않지만 플레이어가 근처에 있으면 데미지)
        this.poisonField = {
            x: this.x,
            y: this.y,
            radius: 80,
            damage: 5,
            duration: 5000,
            startTime: Date.now()
        };
    }
    
    shootFireballs(player, game) {
        // 화염 마법사 - 나선형 화염구 패턴
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 12; i++) {
            const angle = baseAngle + (i * Math.PI / 6); // 30도씩 회전
            game.bossProjectiles.push({
                x: this.x,
                y: this.y,
                angle: angle,
                speed: 180 + (i % 3) * 20, // 속도 변화로 나선 효과
                damage: Math.max(15, Math.floor(this.damage * 0.8)),
                radius: 6,
                color: '#ff4500',
                dead: false
            });
        }
    }
    
    castSlowSpell(player) {
        player.slowEffect = {
            multiplier: 0.5,
            duration: 3000,
            startTime: Date.now()
        };
    }
    
    summonSkeletons(game) {
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            const skeleton = new Enemy(x, y, game.waveLevel + 1, this.color);
            skeleton.health *= 1.5;
            skeleton.maxHealth = skeleton.health;
            game.enemies.push(skeleton);
        }
    }
    
    basicSpecialAttack(player, game) {
        // 강화된 탄막 패턴들
        const patterns = ['burst', 'wave', 'cross', 'spiral'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        switch (pattern) {
            case 'burst':
                // 16방향 폭발형 탄막
                for (let i = 0; i < 16; i++) {
                    const angle = (Math.PI * 2 * i) / 16;
                    game.bossProjectiles.push({
                        x: this.x, y: this.y, angle: angle,
                        speed: 140, damage: Math.floor(this.damage * 0.6),
                        radius: 5, color: this.color, dead: false
                    });
                }
                break;
                
            case 'wave':
                // 물결형 탄막
                const playerAngle = Math.atan2(player.y - this.y, player.x - this.x);
                for (let i = -4; i <= 4; i++) {
                    const angle = playerAngle + (i * 0.2);
                    game.bossProjectiles.push({
                        x: this.x, y: this.y, angle: angle,
                        speed: 160 + Math.abs(i) * 10,
                        damage: Math.floor(this.damage * 0.7),
                        radius: 4, color: '#ff66ff', dead: false
                    });
                }
                break;
                
            case 'cross':
                // 십자형 탄막
                const angles = [0, Math.PI/2, Math.PI, Math.PI*1.5];
                angles.forEach(baseAngle => {
                    for (let j = 0; j < 5; j++) {
                        setTimeout(() => {
                            game.bossProjectiles.push({
                                x: this.x, y: this.y, angle: baseAngle,
                                speed: 120, damage: Math.floor(this.damage * 0.5),
                                radius: 4, color: '#66ffff', dead: false
                            });
                        }, j * 100);
                    }
                });
                break;
                
            case 'spiral':
                // 나선형 탄막
                for (let i = 0; i < 24; i++) {
                    setTimeout(() => {
                        const angle = (Date.now() / 100 + i * 0.3) % (Math.PI * 2);
                        game.bossProjectiles.push({
                            x: this.x, y: this.y, angle: angle,
                            speed: 130, damage: Math.floor(this.damage * 0.4),
                            radius: 3, color: '#ffff66', dead: false
                        });
                    }, i * 50);
                }
                break;
        }
    }
    
    render(ctx) {
        // 보스 몸체
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 보스 테두리
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 체력바
        const barWidth = this.radius * 3;
        const barHeight = 6;
        const healthPercentage = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth, barHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth * healthPercentage, barHeight);
        
        // 보스 이름
        ctx.fillStyle = '#ffff00';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - this.radius - 30);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});