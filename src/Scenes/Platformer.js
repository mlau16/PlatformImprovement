class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.PLAYERSCORE = 0;
    }

    create() {


        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        
        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);


        

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // movement vfx

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            random:true,
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();

        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (player, coin) => {
            my.vfx.coin.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            my.vfx.coin.emitParticleAt(coin.x, coin.y, 15);
            this.PLAYERSCORE++;
            this.scoreText.setText("Score: " + this.PLAYERSCORE);
            coin.destroy(); // remove coin on overlap
        });

        this.coins.forEach(coin => {
            coin.anims.play('spin');
        });

        my.vfx.coin = this.add.particles(0, 0, "kenny-particles", {
            frame: ['star_01.png', 'star_03.png'],
            scale: {start: 0.03, end: 0.25},
            maxAliveParticles: 4,
            lifespan: 350,
            gravityY: -100,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.coin.stop();

        my.vfx.drowning = this.add.particles(0, 0, "kenny-particles", {
            frame: ['circle_01.png','circle_05.png'],  
            scale: { start: 0.01, end: 0.03 },
            alpha: { start: 1, end: 0 },
            speedY: { min: -20, max: -50 },
            lifespan: 1000,
            frequency: 100
        });
        my.vfx.drowning.stop();
        
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        this.scoreText = this.add.text(380, 240, "Score: 0", {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#ffffff'
        }).setScrollFactor(0);

    }

    update() {
        let playerTile = this.groundLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y - my.sprite.player.height / 3  // sample higher, into the water tile
        );
        
        let isInWater = playerTile && playerTile.properties.water;
        
        if (!isInWater) {
            // Left/right movement
            if(cursors.left.isDown) {
                my.sprite.player.setAccelerationX(-this.ACCELERATION);
                my.sprite.player.resetFlip();
                my.sprite.player.anims.play('walk', true);
                if (my.sprite.player.body.blocked.down) {
                    my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
                    my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
                    my.vfx.walking.start();
                }
            } else if(cursors.right.isDown) {
                my.sprite.player.setAccelerationX(this.ACCELERATION);
                my.sprite.player.setFlip(true, false);
                my.sprite.player.anims.play('walk', true);
                if (my.sprite.player.body.blocked.down) {
                    my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
                    my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
                    my.vfx.walking.start();
                }
            } else {
                my.sprite.player.setAccelerationX(0);
                my.sprite.player.setDragX(this.DRAG);
                my.sprite.player.anims.play('idle');
                my.vfx.walking.stop();
            }
        
            if(!my.sprite.player.body.blocked.down) {
                my.sprite.player.anims.play('jump');
            }
        
            if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            }
        
            my.vfx.drowning.stop();
        
        } else {
            // Water behavior
            my.vfx.drowning.startFollow(my.sprite.player);
            my.vfx.drowning.start();
        
            my.sprite.player.setVelocityY(100);  // sink
            my.sprite.player.setAccelerationX(0);  // disable movement
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
            this.cameras.main.fade(1000, 0, 0, 255);
        
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.restart();
            });
        }
        
    }
}