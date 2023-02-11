import Phaser from 'phaser'
import logo from './assets/phaser3-logo.png'

class Demo extends Phaser.Scene {
	constructor() {
		super('GameScene')
	}

	preload() {
		this.load.image('logo', logo)
	}

	create() {
		const { width, height } = this.sys.game.canvas
		const animPixels = 150
		const logo = this.add.image(width / 2, height / 2 - animPixels, 'logo')

		this.tweens.add({
			targets: logo,
			y: height / 2 + animPixels,
			duration: 1500,
			ease: 'Sine.inOut',
			yoyo: true,
			repeat: -1,
		})
	}
}

new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'game',
	backgroundColor: '#33A5E7',
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [Demo],
})
