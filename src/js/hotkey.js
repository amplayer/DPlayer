class HotKey {
    constructor(player) {
        this.player = player;
        this.doHotKeyHandler = this.doHotKey.bind(this);
        this.cancelFullScreenHandler = this.cancelFullScreen.bind(this);
        if (this.player.options.hotkey) {
            document.addEventListener('keydown', this.doHotKeyHandler);
        }

        document.addEventListener('keydown', this.cancelFullScreenHandler);
    }

    doHotKey(e) {
        if (this.player.focus) {
            const tag = document.activeElement.tagName.toUpperCase();
            const editable = document.activeElement.getAttribute('contenteditable');
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && editable !== '' && editable !== 'true') {
                const event = e || window.event;
                let percentage;
                switch (event.keyCode) {
                    case 23: // TV遥控器中键
                    case 32: // PC空格键
                        event.preventDefault();
                        this.player.toggle();
                        break;
                    case 21: // TV遥控器左方向键
                        if (event.key != 'ArrowLeft') break;
                    case 37: // PC左方向键
                        event.preventDefault();
                        if (this.player.options.live) {
                            break;
                        }
                        this.player.seek(this.player.video.currentTime - 5);
                        this.player.controller.setAutoHide();
                        break;
                    case 22: // TV遥控器右方向键
                        if (event.key != 'ArrowRight') break;
                    case 39: // PC右方向键
                        event.preventDefault();
                        if (this.player.options.live) {
                            break;
                        }
                        this.player.seek(this.player.video.currentTime + 5);
                        this.player.controller.setAutoHide();
                        break;
                    case 19: // TV遥控器上方向键
                        if (event.key != 'ArrowUp') break;
                    case 38: // PC上方向键
                        event.preventDefault();
                        percentage = this.player.volume() + 0.1;
                        this.player.volume(percentage);
                        break;
                    case 20: // TV遥控器下方向键
                        if (event.key != 'ArrowDown') break;
                    case 40: // PC下方向键
                        event.preventDefault();
                        percentage = this.player.volume() - 0.1;
                        this.player.volume(percentage);
                        break;
                }
            }
        }
    }

    cancelFullScreen(e) {
        const event = e || window.event;
        switch (event.keyCode) {
            case 27:
                if (this.player.fullScreen.isFullScreen('web')) {
                    this.player.fullScreen.cancel('web');
                }
                break;
        }
    }

    destroy() {
        if (this.player.options.hotkey) {
            document.removeEventListener('keydown', this.doHotKeyHandler);
        }
        document.removeEventListener('keydown', this.cancelFullScreenHandler);
    }
}

export default HotKey;
