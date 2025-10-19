import utils from './utils';
import Thumbnails from './thumbnails';
import Icons from './icons';

let cast;
let runOnce = true;
let isCasting = false;

class Controller {
    constructor(player) {
        this.player = player;

        this.autoHideTimer = 0;
        if (!utils.isMobile) {
            this.setAutoHideHandler = this.setAutoHide.bind(this);
            this.player.container.addEventListener('mousemove', this.setAutoHideHandler);
            this.player.container.addEventListener('click', this.setAutoHideHandler);
            this.player.on('play', this.setAutoHideHandler);
            this.player.on('pause', this.setAutoHideHandler);
        }

        this.initPlayButton();
        this.initThumbnails();
        this.initPlayedBar();
        
        if (this.player.options.touchVideoChangeProgress){
            this.initVideoTouch(); // [SWH|+]
        }

        this.initFullButton();
        this.initQualityButton();
        this.initScreenshotButton();
        // if subtitle url not array, not init old single subtitle button
        if (this.player.options.subtitle) {
            if (typeof this.player.options.subtitle.url === 'string') {
                this.initSubtitleButton();
            }
        }
        this.initHighlights();
        this.initAirplayButton();
        this.initChromecastButton();
        if (!utils.isMobile) {
            this.initVolumeButton();
        }
    }

    initPlayButton() {
        this.playButtonToggle = () => {
            this.player.toggle();
        }
        this.controllerToggle = () => {
            this.toggle();
        }
        this.player.template.playButton.addEventListener('click', this.playButtonToggle);

        this.player.template.mobilePlayButton.addEventListener('click', this.playButtonToggle);
        // [SWH|+] ---\
        this.player.template.mobileBackwardButton.addEventListener('click', this.mobileBackwardButtonOnClick = () => {
            let t = Math.max(this.player.video.currentTime - 10, 0);
            this.player.seek(t);
            this.player.controller.setAutoHide();
        });
        this.player.template.mobileForwardButton.addEventListener('click', this.mobileForwardButtonOnClick = () => {
            let t = Math.min(this.player.video.currentTime + 10, this.player.video.duration);
            this.player.seek(t);
            this.player.controller.setAutoHide();
        });
        // -----------/
        if (!utils.isMobile) {
            if (!this.player.options.preventClickToggle) {
                this.player.template.videoWrap.addEventListener('click', this.playButtonToggle);
                this.player.template.controllerMask.addEventListener('click', this.playButtonToggle);
            }
        } else {
            this.player.template.videoWrap.addEventListener('click', this.controllerToggle);
            this.player.template.controllerMask.addEventListener('click', this.controllerToggle);
        }
    }

    initHighlights() {
        this.player.on('durationchange', () => {
            if (this.player.video.duration !== 1 && this.player.video.duration !== Infinity) {
                if (this.player.options.highlight) {
                    const highlights = this.player.template.playedBarWrap.querySelectorAll('.dplayer-highlight');
                    [].slice.call(highlights, 0).forEach((item) => {
                        this.player.template.playedBarWrap.removeChild(item);
                    });
                    for (let i = 0; i < this.player.options.highlight.length; i++) {
                        if (!this.player.options.highlight[i].text || !this.player.options.highlight[i].time) {
                            continue;
                        }
                        const p = document.createElement('div');
                        p.classList.add('dplayer-highlight');
                        p.style.left = (this.player.options.highlight[i].time / this.player.video.duration) * 100 + '%';
                        p.innerHTML = '<span class="dplayer-highlight-text">' + this.player.options.highlight[i].text + '</span>';
                        this.player.template.playedBarWrap.insertBefore(p, this.player.template.playedBarTime);
                    }
                }
            }
        });
    }

    initThumbnails() {
        if (this.player.options.video.thumbnails) {
            this.thumbnails = new Thumbnails({
                container: this.player.template.barPreview,
                barWidth: this.player.template.barWrap.offsetWidth,
                url: this.player.options.video.thumbnails,
                events: this.player.events,
            });

            this.player.on('loadedmetadata', () => {
                this.thumbnails.resize(160, (this.player.video.videoHeight / this.player.video.videoWidth) * 160, this.player.template.barWrap.offsetWidth);
            });
        }
    }

    initPlayedBar() {
        const thumbMove = (e) => {
            let percentage = ((e.clientX || e.changedTouches[0].clientX) - utils.getBoundingClientRectViewLeft(this.player.template.playedBarWrap)) / this.player.template.playedBarWrap.clientWidth;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.bar.set('played', percentage, 'width');
            this.player.template.ptime.innerHTML = utils.secondToTime(percentage * this.player.video.duration);
        };

        const thumbUp = (e) => {
            document.removeEventListener(utils.nameMap.dragEnd, thumbUp);
            document.removeEventListener(utils.nameMap.dragMove, thumbMove);
            let percentage = ((e.clientX || e.changedTouches[0].clientX) - utils.getBoundingClientRectViewLeft(this.player.template.playedBarWrap)) / this.player.template.playedBarWrap.clientWidth;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.bar.set('played', percentage, 'width');
            this.player.seek(this.player.bar.get('played') * this.player.video.duration);
            this.player.moveBar = false;
        };

        this.player.template.playedBarWrap.addEventListener(utils.nameMap.dragStart, this.playedBarWrapOnDragStart = () => {
            this.player.moveBar = true;
            document.addEventListener(utils.nameMap.dragMove, thumbMove);
            document.addEventListener(utils.nameMap.dragEnd, thumbUp);
        });

        this.player.template.playedBarWrap.addEventListener(utils.nameMap.dragMove, this.playedBarWrapOnDragMove = (e) => {
            if (this.player.video.duration) {
                const px = this.player.template.playedBarWrap.getBoundingClientRect().left;
                const tx = (e.clientX || e.changedTouches[0].clientX) - px;
                if (tx < 0 || tx > this.player.template.playedBarWrap.offsetWidth) {
                    return;
                }
                const time = this.player.video.duration * (tx / this.player.template.playedBarWrap.offsetWidth);
                if (utils.isMobile) {
                    this.thumbnails && this.thumbnails.show();
                }
                this.thumbnails && this.thumbnails.move(tx);
                this.player.template.playedBarTime.style.left = `${tx - (time >= 3600 ? 25 : 20)}px`;
                this.player.template.playedBarTime.innerText = utils.secondToTime(time);
                this.player.template.playedBarTime.classList.remove('hidden');
            }
        });

        this.player.template.playedBarWrap.addEventListener(utils.nameMap.dragEnd, this.playedBarWrapOnDragEnd = () => {
            if (utils.isMobile) {
                this.thumbnails && this.thumbnails.hide();
            }
        });

        if (!utils.isMobile) {
            this.playedBarWrapOnMouseenter = () => {
                if (this.player.video.duration) {
                    this.thumbnails && this.thumbnails.show();
                    this.player.template.playedBarTime.classList.remove('hidden');
                }
            }
            this.player.template.playedBarWrap.addEventListener('mouseenter', this.playedBarWrapOnMouseenter);
            this.playedBarWrapOnMouseleave = () => {
                if (this.player.video.duration) {
                    this.thumbnails && this.thumbnails.hide();
                    this.player.template.playedBarTime.classList.add('hidden');
                }
            }
            this.player.template.playedBarWrap.addEventListener('mouseleave', this.playedBarWrapOnMouseleave);
        }
    }

    // [SWH|+]
    initVideoTouch() {
        if (!utils.isMobile) return;
        let xStart = 0, currentTime = 0;
        const getPercentage = (e) => {
            let x = e.clientX || e.changedTouches[0].clientX;
            if (x == xStart) return false;
            let percentage = (x - xStart) / this.player.template.video.clientWidth;
            percentage = (currentTime / this.player.video.duration) + percentage;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            return percentage;
        };
        this.videoTouchOnDragMove = (e) => {
            if (this.player.options.live || !this.player.video.duration) return;
            let percentage = getPercentage(e);
            if (percentage === false) return;
            this.player.moveBar = true;
            this.show();
            this.player.bar.set('played', percentage, 'width');
            this.player.template.ptime.innerHTML = utils.secondToTime(percentage * this.player.video.duration);
        };
        this.videoTouchOnDragEnd = (e) => {
            if (this.player.options.live || !this.player.video.duration) return;
            document.removeEventListener(utils.nameMap.dragEnd, this.videoTouchOnDragEnd);
            document.removeEventListener(utils.nameMap.dragMove, this.videoTouchOnDragMove);
            let percentage = getPercentage(e);
            if (percentage === false) return;
            this.player.bar.set('played', percentage, 'width');
            this.player.seek(percentage * this.player.video.duration);
            this.player.moveBar = false;
            this.hide();
        };
        this.videoTouchOnDragStart = (e) => {
            if (this.player.options.live || !this.player.video.duration) return;
            xStart = e.clientX || e.changedTouches[0].clientX;
            currentTime = this.player.video.currentTime;
        };
        this.player.template.video.addEventListener(utils.nameMap.dragStart, this.videoTouchOnDragStart);
        this.player.template.video.addEventListener(utils.nameMap.dragMove, this.videoTouchOnDragMove);
        this.player.template.video.addEventListener(utils.nameMap.dragEnd, this.videoTouchOnDragEnd);
        this.player.template.mask.addEventListener(utils.nameMap.dragStart, this.videoTouchOnDragStart);
        this.player.template.mask.addEventListener(utils.nameMap.dragMove, this.videoTouchOnDragMove);
        this.player.template.mask.addEventListener(utils.nameMap.dragEnd, this.videoTouchOnDragEnd);
    }

    initFullButton() {
        this.player.template.browserFullButton.addEventListener('click', this.browserFullButtonOnClick = () => {
            this.player.fullScreen.toggle('browser');
        });

        this.player.template.webFullButton.addEventListener('click', this.webFullButtonOnClick = () => {
            this.player.fullScreen.toggle('web');
        });
    }

    initVolumeButton() {
        const vWidth = 35;

        const volumeMove = (event) => {
            const e = event || window.event;
            const percentage = ((e.clientX || e.changedTouches[0].clientX) - utils.getBoundingClientRectViewLeft(this.player.template.volumeBarWrap) - 5.5) / vWidth;
            this.player.volume(percentage);
        };
        const volumeUp = () => {
            document.removeEventListener(utils.nameMap.dragEnd, volumeUp);
            document.removeEventListener(utils.nameMap.dragMove, volumeMove);
            this.player.template.volumeButton.classList.remove('dplayer-volume-active');
        };

        this.player.template.volumeBarWrapWrap.addEventListener('click', this.volumeBarWrapWrapOnClick = (event) => {
            const e = event || window.event;
            const percentage = ((e.clientX || e.changedTouches[0].clientX) - utils.getBoundingClientRectViewLeft(this.player.template.volumeBarWrap) - 5.5) / vWidth;
            this.player.volume(percentage);
        });
        this.player.template.volumeBarWrapWrap.addEventListener(utils.nameMap.dragStart, this.volumeBarWrapWrapOnDragStart = () => {
            document.addEventListener(utils.nameMap.dragMove, volumeMove);
            document.addEventListener(utils.nameMap.dragEnd, volumeUp);
            this.player.template.volumeButton.classList.add('dplayer-volume-active');
        });
        this.player.template.volumeButtonIcon.addEventListener('click', this.volumeButtonIconOnClick = () => {
            if (this.player.video.muted) {
                this.player.video.muted = false;
                this.player.switchVolumeIcon();
                this.player.bar.set('volume', this.player.volume(), 'width');
            } else {
                this.player.video.muted = true;
                this.player.template.volumeIcon.innerHTML = Icons.volumeOff;
                this.player.bar.set('volume', 0, 'width');
            }
        });
    }

    initQualityButton() {
        if (this.player.options.video.quality) {
            this.player.template.qualityList.addEventListener('click', this.qualityListOnClick = (e) => {
                if (e.target.classList.contains('dplayer-quality-item')) {
                    this.player.switchQuality(e.target.dataset.index);
                }
            });
        }
    }

    initScreenshotButton() {
        if (this.player.options.screenshot) {
            this.player.template.camareButton.addEventListener('click', this.camareButtonOnClick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = this.player.video.videoWidth;
                canvas.height = this.player.video.videoHeight;
                canvas.getContext('2d').drawImage(this.player.video, 0, 0, canvas.width, canvas.height);

                let dataURL;
                canvas.toBlob((blob) => {
                    dataURL = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = dataURL;
                    link.download = 'DPlayer.png';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(dataURL);
                    this.player.events.trigger('screenshot', dataURL);
                });
            });
        }
    }

    initAirplayButton() {
        if (this.player.options.airplay) {
            if (window.WebKitPlaybackTargetAvailabilityEvent) {
                this.player.video.addEventListener(
                    'webkitplaybacktargetavailabilitychanged',
                    this.videoOnWebkitplaybacktargetavailabilitychanged = function (event) {
                        switch (event.availability) {
                            case 'available':
                                this.template.airplayButton.disable = false;
                                break;

                            default:
                                this.template.airplayButton.disable = true;
                        }

                        this.template.airplayButton.addEventListener(
                            'click',
                            this.airplayButtonOnClick = function () {
                                this.video.webkitShowPlaybackTargetPicker();
                            }.bind(this)
                        );
                    }.bind(this.player)
                );
            } else {
                this.player.template.airplayButton.style.display = 'none';
            }
        }
    }

    initChromecast() {
        const script = window.document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1');
        window.document.body.appendChild(script);

        window.__onGCastApiAvailable = (isAvailable) => {
            if (isAvailable) {
                cast = window.chrome.cast;
                const sessionRequest = new cast.SessionRequest(cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
                const apiConfig = new cast.ApiConfig(
                    sessionRequest,
                    () => {},
                    (status) => {
                        if (status === cast.ReceiverAvailability.AVAILABLE) {
                            console.log('chromecast: ', status);
                        }
                    }
                );
                cast.initialize(apiConfig, () => {});
            }
        };
    }

    initChromecastButton() {
        if (this.player.options.chromecast) {
            if (runOnce) {
                runOnce = false;
                this.initChromecast();
            }
            const discoverDevices = () => {
                cast.requestSession(
                    (s) => {
                        this.session = s;
                        launchMedia(this.player.options.video.url);
                    },
                    (err) => {
                        if (err.code === 'cancel') {
                            this.session = undefined;
                        } else {
                            console.error('Error selecting a cast device', err);
                        }
                    }
                );
            };

            const launchMedia = (media) => {
                const mediaInfo = new cast.media.MediaInfo(media);
                const request = new cast.media.LoadRequest(mediaInfo);

                if (!this.session) {
                    window.open(media);
                    return false;
                }
                this.session.loadMedia(request, onMediaDiscovered.bind(this, 'loadMedia'), onMediaError).play();
                return true;
            };

            const onMediaDiscovered = (how, media) => {
                this.currentMedia = media;
            };

            const onMediaError = (err) => {
                console.error('Error launching media', err);
            };

            this.player.template.chromecastButton.addEventListener('click', this.chromecastButtonOnClick = () => {
                if (isCasting) {
                    isCasting = false;
                    this.currentMedia.stop();
                    this.session.stop();
                    this.initChromecast();
                } else {
                    isCasting = true;
                    discoverDevices();
                }
            });
        }
    }

    initSubtitleButton() {
        this.player.events.on('subtitle_show', () => {
            this.player.template.subtitleButton.dataset.balloon = this.player.tran('hide-subs');
            this.player.template.subtitleButtonInner.style.opacity = '';
            this.player.user.set('subtitle', 1);
        });
        this.player.events.on('subtitle_hide', () => {
            this.player.template.subtitleButton.dataset.balloon = this.player.tran('show-subs');
            this.player.template.subtitleButtonInner.style.opacity = '0.4';
            this.player.user.set('subtitle', 0);
        });

        this.player.template.subtitleButton.addEventListener('click', this.subtitleButtonOnClick = () => {
            this.player.subtitle.toggle();
        });
    }

    setAutoHide() {
        this.show();
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = setTimeout(() => {
            if (this.player.video.played.length && !this.player.paused && !this.disableAutoHide) {
                this.hide();
            }
        }, 3000);
    }

    show() {
        this.player.container.classList.remove('dplayer-hide-controller');
    }

    hide() {
        this.player.container.classList.add('dplayer-hide-controller');
        this.player.setting.hide();
        this.player.comment && this.player.comment.hide();
    }

    isShow() {
        return !this.player.container.classList.contains('dplayer-hide-controller');
    }

    toggle() {
        if (this.isShow()) {
            this.hide();
        } else {
            this.show();
        }
    }

    destroy() {
        if (!utils.isMobile) {
            this.player.container.removeEventListener('mousemove', this.setAutoHideHandler);
            this.player.container.removeEventListener('click', this.setAutoHideHandler);
            this.player.template.playedBarWrap.removeEventListener('mouseenter',this.playedBarWrapOnMouseenter);
            this.player.template.playedBarWrap.removeEventListener('mouseleave',this.playedBarWrapOnMouseleave);
        }
        if(this.playButtonToggle) this.player.template.playButton.removeEventListener('click',this.playButtonToggle);
        if(this.playButtonToggle) this.player.template.mobilePlayButton.removeEventListener('click',this.playButtonToggle);
        if(this.mobileBackwardButtonOnClick) this.player.template.mobileBackwardButton.removeEventListener('click',this.mobileBackwardButtonOnClick);
        if(this.mobileForwardButtonOnClick) this.player.template.mobileForwardButton.removeEventListener('click',this.mobileForwardButtonOnClick);
        if(this.controllerToggle) this.player.template.videoWrap.removeEventListener('click',this.controllerToggle);
        if(this.controllerToggle) this.player.template.controllerMask.removeEventListener('click',this.controllerToggle);
        if(this.playedBarWrapOnDragStart) this.player.template.playedBarWrap.removeEventListener(utils.nameMap.dragStart,this.playedBarWrapOnDragStart);
        if(this.playedBarWrapOnDragMove) this.player.template.playedBarWrap.removeEventListener(utils.nameMap.dragMove,this.playedBarWrapOnDragMove);
        if(this.playedBarWrapOnDragEnd) this.player.template.playedBarWrap.removeEventListener(utils.nameMap.dragEnd,this.playedBarWrapOnDragEnd);
        if (utils.isMobile) {
        this.player.template.video.removeEventListener(utils.nameMap.dragStart,this.videoTouchOnDragStart);
        this.player.template.video.removeEventListener(utils.nameMap.dragMove,this.videoTouchOnDragMove);
        this.player.template.video.removeEventListener(utils.nameMap.dragEnd,this.videoTouchOnDragEnd);
        this.player.template.mask.removeEventListener(utils.nameMap.dragStart,this.videoTouchOnDragStart);
        this.player.template.mask.removeEventListener(utils.nameMap.dragMove,this.videoTouchOnDragMove);
        this.player.template.mask.removeEventListener(utils.nameMap.dragEnd,this.videoTouchOnDragEnd);
        }
        if(this.browserFullButtonOnClick) this.player.template.browserFullButton.removeEventListener('click',this.browserFullButtonOnClick);
        if(this.webFullButtonOnClick) this.player.template.webFullButton.removeEventListener('click',this.webFullButtonOnClick);
        if(this.volumeBarWrapWrapOnClick) this.player.template.volumeBarWrapWrap.removeEventListener('click',this.volumeBarWrapWrapOnClick);
        if(this.volumeBarWrapWrapOnClickDragStart) this.player.template.volumeBarWrapWrap.removeEventListener(utils.nameMap.dragStart,this.volumeBarWrapWrapOnClickDragStart);
        if(this.volumeButtonIconOnClick) this.player.template.volumeButtonIcon.removeEventListener('click',this.volumeButtonIconOnClick);
        if(this.player.template.qualityList && this.qualityListOnClick) this.player.template.qualityList.removeEventListener('click',this.qualityListOnClick);
        if(this.player.template.camareButton && this.camareButtonOnClick) this.player.template.camareButton.removeEventListener('click',this.camareButtonOnClick);
        if(this.videoOnWebkitplaybacktargetavailabilitychanged) this.player.template.video.removeEventListener('webkitplaybacktargetavailabilitychanged',this.videoOnWebkitplaybacktargetavailabilitychanged);
        if(this.player.template.airplayButton && this.airplayButtonOnClick) this.player.template.airplayButton.removeEventListener('click',this.airplayButtonOnClick);
        if(this.player.template.chromecastButton && this.subtitleButtonOnClick) this.player.template.chromecastButton.removeEventListener('click',this.subtitleButtonOnClick);
        clearTimeout(this.autoHideTimer);
    }
}

export default Controller;
