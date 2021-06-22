var mock = document.querySelector('#mock');
var mock2 = document.querySelector('#mock2');
var mocks = document.querySelectorAll('.mock');
var svgMock = document.querySelector('#svg-mock');
var scrollableEl = document.querySelector('.scrollable-outer');

function afterNextFrame(fn) {
	requestAnimationFrame(function () {
		setTimeout(fn);
	});
}

describe('Transformer', function () {
	var interval;
	var transformer;
	var transformer2;

	beforeEach(function () {
		mock.removeAttribute('transform');
		mock.style.transform = 'none';
		svgMock.removeAttribute('transform');
		scroll(0, 0);
		scrollableEl.scrollTop = 0;
	});

	afterEach(function () {
		clearInterval(interval);
		if (transformer) {
			transformer.reset();
		}
		if (transformer2) {
			transformer2.reset();
		}
	});

	it('should exist', function () {
		Transformer.should.be.a.Function();
	});

	it('should init', function () {
		transformer = new Transformer([]);
		transformer.active.should.be.true();
	});

	it('should stop', function () {
		transformer.stop();
		transformer.active.should.be.false();
	});

	it('should change elements by i', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				transforms: [
					['scale', function (x, y, i) {
						return (i < 3) ? 1 : 2;
					}]
				]
			}
		]);

		interval = setInterval(function () {
			if (mock.style.transform === 'scale(1)') {
				clearInterval(interval);

				interval = setInterval(function () {
					if (mock.style.transform === 'scale(2)') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should change elements by y', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				transforms: [
					['scale', function (x, y, i) {
						return (y < 5) ? 1 : 2;
					}]
				]
			}
		]);

		interval = setInterval(function () {
			if (mock.style.transform === 'scale(1)') {
				scroll(0, 10);
				clearInterval(interval);

				interval = setInterval(function () {
					if (mock.style.transform === 'scale(2)') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should accept just one object as well as an array', function (done) {
		transformer = new Transformer({
			el: mock,
			transforms: [
				['scale', function (x, y, i) {
					return (i < 3) ? 1 : 2;
				}]
			]
		});

		interval = setInterval(function () {
			if (mock.style.transform === 'scale(1)') {
				clearInterval(interval);
				done();
			}
		}, 20);
	});

	it('should support visible property', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				visible: [0, 10]
			}
		]);

		scroll(0, 20);

		interval = setInterval(function () {
			if (getComputedStyle(mock).display === 'none') {
				scroll(0, 0);
				clearInterval(interval);

				interval = setInterval(function () {
					if (getComputedStyle(mock).display === 'block') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should support global visible method', function (done) {
		transformer = new Transformer([
			{
				el: mock,
			}
		]);

		transformer.setVisible([0, 10]);

		scroll(0, 20);

		interval = setInterval(function () {
			if (getComputedStyle(mock).display === 'none') {
				scroll(0, 0);
				clearInterval(interval);

				interval = setInterval(function () {
					if (getComputedStyle(mock).display === 'block') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should not move display set using css to style attr when toggling visibility', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				visible: [0, 10]
			}
		]);

		scroll(0, 20);

		interval = setInterval(function () {
			if (getComputedStyle(mock).display === 'none') {
				scroll(0, 0);
				clearInterval(interval);

				interval = setInterval(function () {
					if (getComputedStyle(mock).display === 'block') {
						Should(mock.style.display).not.be.ok;
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should not call transform functions if element hidden', function (done) {
		var called = 0;

		transformer = new Transformer([
			{
				el: mock,
				visible: [0, 10],
				styles: [['opacity', function (i) {
					called++;
				}]],
				attrs: [['opacity', function (i) {
					called++;
				}]],
			}
		]);

		scroll(0, 20);

		interval = setInterval(function () {
			if (getComputedStyle(mock).display === 'none') {
				called.should.equal(0);

				clearInterval(interval);
				done();
			}
		}, 20);
	});

	it('should leave original transforms alone', function (done) {
		transformer = new Transformer([
			{
				el: svgMock,
				transforms: [
					['scale', function (x, y, i) {
						return (y < 5) ? 1 : 2;
					}]
				]
			}
		]);

		svgMock.setAttribute('transform', 'translate(100 200)');

		interval = setInterval(function () {
			if (svgMock.getAttribute('transform') === 'translate(100 200) scale(1)') {
				scroll(0, 10);

				clearInterval(interval);

				interval = setInterval(function () {
					if (svgMock.getAttribute('transform') === 'translate(100 200) scale(2)') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should unset transforms on reset', function (done) {
		transformer = new Transformer([
			{
				el: svgMock,
				transforms: [
					['scale', function (x, y, i) {
						return (y < 5) ? 1 : 2;
					}]
				]
			}
		]);

		svgMock.setAttribute('transform', 'translate(100 200)');

		interval = setInterval(function () {
			if (svgMock.getAttribute('transform').indexOf('scale(') !== -1) {
				svgMock.getAttribute('transform').should.containEql('translate(100 200)');

				transformer.reset();

				clearInterval(interval);

				interval = setInterval(function () {
					if (svgMock.getAttribute('transform').indexOf('scale(') === -1) {
						svgMock.getAttribute('transform').should.containEql('translate(100 200)');
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should support NodeLists', function (done) {
		transformer = new Transformer([
			{
				el: mocks,
				styles: [
					['opacity', function (x, y, i) {
						return (y < 5) ? 1 : 0;
					}]
				]
			}
		]);


		scroll(0, 20);

		interval = setInterval(function () {
			if (getComputedStyle(mock).opacity === '0') {
				getComputedStyle(mock2).opacity.should.equal('0');

				scroll(0, 0);

				clearInterval(interval);

				interval = setInterval(function () {
					if (getComputedStyle(mock).opacity === '1') {
						getComputedStyle(mock2).opacity.should.equal('1');
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should use attr for SVG transforms', function (done) {
		transformer = new Transformer([
			{
				el: svgMock,
				transforms: [
					['scale', function (x, y, i) {
						return (i < 3) ? 1 : 2;
					}]
				]
			}
		]);

		interval = setInterval(function () {
			if (svgMock.getAttribute('transform').trim() === 'scale(1)') {

				clearInterval(interval);

				interval = setInterval(function () {
					if (svgMock.getAttribute('transform').trim() === 'scale(2)') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should pass in requested arguments only', function (done) {
		var lastY = -1;

		transformer = new Transformer([
			{
				el: mock,
				transforms: [
					['scale', function (y) {
						lastY = y;
						return 1;
					}]
				]
			}
		]);

		scroll(0, 14);

		interval = setInterval(function () {
			if (lastY === 14) {
				clearInterval(interval);
				done();
			}
		}, 20);
	});

	it('should pass in requested arguments only (minified)', function (done) {
		var lastY = -1;

		transformer = new Transformer([
			{
				el: mock,
				transforms: [
					['scale', ['y', function (a) {
						lastY = a;
						return 1;
					}]]
				]
			}
		]);

		scroll(0, 14);

		interval = setInterval(function () {
			if (lastY === 14) {
				clearInterval(interval);
				done();
			}
		}, 20);
	});

	it('should not call fn if request args unchanged', function (done) {
		var called = 0;

		transformer = new Transformer([
			{
				el: mock,
				attrs: [
					['data-test', function (y) {
						called++;
					}]
				]
			}
		]);

		scroll(0, 10);

		interval = setInterval(function () {
			if (called === 1) {
				clearInterval(interval);
				scroll(0, 0);

				interval = setInterval(function () {
					if (called === 2) {
						clearInterval(interval);

						setTimeout(function () {
							called.should.equal(2);
							done();
						}, 50);
					}
				}, 20);
			}
		}, 20);
	});

	it('should call fn once if no arguments', function (done) {
		var called = 0;

		transformer = new Transformer([
			{
				el: mock,
				attrs: [
					['data-test', function () {
						called++;
					}]
				]
			}
		]);

		scroll(0, 10);

		interval = setInterval(function () {
			if (called === 1) {
				clearInterval(interval);
				scroll(0, 0);

				setTimeout(function () {
					called.should.equal(1);
					done();
				}, 50);
			}
		}, 20);
	});

	it('should support getting the scroll position of other elements', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				transforms: [
					['scale', function (x, y, i) {
						return (y < 5) ? 1 : 2;
					}]
				]
			}
		]);

		transformer.scrollElement = '.scrollable-outer';

		interval = setInterval(function () {
			if (mock.style.transform === 'scale(1)') {
				scrollableEl.scrollTop = 10;
				clearInterval(interval);

				interval = setInterval(function () {
					if (mock.style.transform === 'scale(2)') {
						clearInterval(interval);
						done();
					}
				}, 20);
			}
		}, 20);
	});

	it('should not call fn if request args unchanged when using scroll position of other element', function (done) {
		var called = 0;

		transformer = new Transformer([
			{
				el: mock,
				attrs: [
					['data-test', function (y) {
						called++;
					}]
				]
			}
		]);

		transformer.scrollElement = '.scrollable-outer';

		scrollableEl.scrollTop = 10;

		interval = setInterval(function () {
			if (called === 1) {
				clearInterval(interval);
				scrollableEl.scrollTop = 0;

				interval = setInterval(function () {
					if (called === 2) {
						clearInterval(interval);

						setTimeout(function () {
							called.should.equal(2);
							done();
						}, 50);
					}
				}, 20);
			}
		}, 20);
	});

	it('should support changing multiple css styles at once', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				styles: [
					[['clip-path', 'webkit-clip-path'], function (i) {
						return 'circle(50px at 0% 100px)';
					}]
				]
			}
		]);

		interval = setInterval(function () {
			if (mock.style.clipPath.startsWith('circle(50px at') ||
				(mock.style['webkit-clip-path'] && mock.style['webkit-clip-path'].startsWith('circle(50px at'))) {
				clearInterval(interval);
				done();
			}
		}, 20);
	});

	// This test doesn't work in phantomjs
	it.skip('should support setting CSS variables', function (done) {
		transformer = new Transformer([
			{
				el: mock,
				properties: [
					['--foo', function (i) {
						return 'blue';
					}]
				]
			}
		]);

		interval = setInterval(function () {
			const property = mock.style.getPropertyValue('--foo');
			if (property === 'blue') {
				clearInterval(interval);
				done();
			}
		}, 20);
	});

	describe('actions and triggers', function () {
		it('should support triggering actions', function (done) {
			var lastActions;
			var called = 0;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (actions) {
							lastActions = actions;
							called++;
						}]
					]
				}
			]);

			interval = setInterval(function () {
				if (called === 1) {
					clearInterval(interval);

					lastActions.should.not.have.property('test');

					transformer.trigger('test', 100);

					var lastVal = 0;

					interval = setInterval(function () {
						if (lastActions.test === undefined) {
							done();
							clearInterval(interval);
							return;
						}

						lastActions.test.should.be.a.Number();
						lastActions.test.should.not.be.below(lastVal);
						lastActions.test.should.be.within(0, 1);

						lastVal = lastActions.test;
					}, 5);
				}
			}, 5);
		});

		it('should support smart arguments and not be called when not needed', function (done) {
			var lastActions;
			var called = 0;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (actions) {
							lastActions = actions;
							called++;
						}]
					]
				}
			]);

			interval = setInterval(function () {
				if (called === 1) {
					clearInterval(interval);

					transformer.trigger('test', 30);

					interval = setInterval(function () {
						if (lastActions.test === 1) {
							clearInterval(interval);

							called.should.be.above(2);
							var calledNow = called;

							setTimeout(function () {
								// Called should have increased by only one
								called.should.equal(calledNow + 1);
								done();
							}, 30);
						}
					}, 5);
				}
			}, 1);
		});

		it('should allow multiple actions to be called at once', function (done) {
			var lastActions;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (actions) {
							lastActions = actions;
						}]
					]
				}
			]);

			transformer.trigger('test', 60);
			transformer.trigger('test2', 120);

			interval = setInterval(function () {
				lastActions.should.have.property('test2');

				if (lastActions.test < 1) {
					lastActions.test.should.be.approximately(lastActions.test2 * 2, 0.05);
				} else {
					lastActions.test2.should.be.above(0.4999);
					clearInterval(interval);
					done();
				}
			}, 20);
		});

		it('shouldn\'t fist fite if multiple actions on multiple transformers called', function (done) {
			transformer = new Transformer([
				{
					el: mock,
					transforms: [
						['scale', function (actions) {
							return actions.test ? 0.5 : 0;
						}]
					]
				}
			]);

			transformer2 = new Transformer([
				{
					el: mock,
					transforms: [
						['scale', function (actions) {
							return actions.test ? 0.6 : 0;
						}]
					]
				}
			]);

			afterNextFrame(function () {
				transformer.trigger('test', 60);

				setTimeout(function () {
					mock.style.transform.should.equal('scale(0.5)');

					afterNextFrame(function () {
						transformer2.trigger('test', 60);

						setTimeout(function () {
							mock.style.transform.should.equal('scale(0.6)');

							done();
						}, 50);
					});
				}, 50);
			});
		});

		it('shouldn\'t fist fite if multiple actions on multiple transformers called (and they change)', function (done) {
			transformer = new Transformer([
				{
					el: mock,
					transforms: [
						['scale', function (actions) {
							return 0.5 + Math.random() / 100;
						}]
					]
				}
			]);

			transformer2 = new Transformer([
				{
					el: mock,
					transforms: [
						['scale', function (actions) {
							return 0.6 + Math.random() / 100;
						}]
					]
				}
			]);

			afterNextFrame(function () {
				transformer.trigger('test', 60);

				setTimeout(function () {
					mock.style.transform.should.startWith('scale(0.5');

					afterNextFrame(function () {
						transformer2.trigger('test', 60);

						setTimeout(function () {
							mock.style.transform.should.startWith('scale(0.6');

							done();
						}, 50);
					});
				}, 50);
			});
		});

		it('should return a promise that resolves when action complete', function () {
			transformer = new Transformer([]);

			var start = Date.now();

			return transformer.trigger('test', 60)
				.then(function () {
					(Date.now() - start).should.be.approximately(60, 30);
				});
		});

		it('should return nothing if window.Promise undefined', function () {
			var Promise = window.Promise;
			window.Promise = undefined;

			// This so that if the test fails, it doesn't break anything else
			setTimeout(function () {
				window.Promise = Promise;
			});

			transformer = new Transformer([]);

			Should(transformer.trigger('test', 60)).equal(undefined);

			window.Promise = Promise;
		});

		it('should call action functions once more after action has finished', function (done) {
			const actionVals = [];

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (actions) {
							actionVals.push(actions.test);
						}]
					]
				}
			]);

			transformer.trigger('test', 40);

			setTimeout(function () {
				actionVals[0].should.be.within(0, 1);
				actionVals[actionVals.length - 2].should.be.within(0, 1);
				Should(actionVals[actionVals.length - 1]).equal(undefined);
				done();
			}, 80);
		});
	});

	describe('change detection', function () {
		it('should not write transform changes to DOM if transforms haven\'t changed', function (done) {
			var called = 0;

			var transformPart = {
				el: mock,
				transforms: [
					['scale', function (i) {
						called++;
						return 1;
					}]
				]
			};

			transformer = new Transformer([ transformPart ]);

			interval = setInterval(function () {
				if (called === 1) {
					transformPart._stagedData.transforms.should.deepEqual([['scale', '1']]);
				}

				if (called > 1) {
					// These need to be startsWith or phantomjs will fail
					transformPart._stagedData.transforms.toString().should.startWith('Symbol(unchanged)');
					clearInterval(interval);
					done();
				}
			}, 5);
		});

		it('should not write style changes to DOM if style hasn\'t changed', function (done) {
			var called = 0;

			var transformPart = {
				el: mock,
				styles: [
					['opacity', function (i) {
						called++;
						return 1;
					}]
				]
			};

			transformer = new Transformer([ transformPart ]);

			interval = setInterval(function () {
				if (called === 1) {
					transformPart._stagedData.styles.opacity.should.equal('1');
				}

				if (called > 1) {
					transformPart._stagedData.styles.opacity.toString().should.startWith('Symbol(unchanged)');
					clearInterval(interval);
					done();
				}
			}, 5);
		});

		it('should not write attr changes to DOM if they haven\'t changed', function (done) {
			var called = 0;

			var transformPart = {
				el: mock,
				attrs: [
					['data-test', function (i) {
						called++;
						return 'foo';
					}]
				]
			};

			transformer = new Transformer([ transformPart ]);

			interval = setInterval(function () {
				if (called === 1) {
					transformPart._stagedData.attrs['data-test'].should.equal('foo');
				}

				if (called > 1) {
					transformPart._stagedData.attrs['data-test'].toString().should.startWith('Symbol(unchanged)');
					clearInterval(interval);
					done();
				}
			}, 5);
		});

		it('should not write property changes to DOM if they haven\'t changed', function (done) {
			var called = 0;

			var transformPart = {
				el: mock,
				properties: [
					['--foo', function (i) {
						called++;
						return 'blue';
					}]
				]
			};

			transformer = new Transformer([ transformPart ]);

			interval = setInterval(function () {
				if (called === 1) {
					transformPart._stagedData.props['--foo'].should.equal('blue');
				}

				if (called > 1) {
					transformPart._stagedData.props['--foo'].toString().should.startWith('Symbol(unchanged)');
					clearInterval(interval);
					done();
				}
			}, 5);
		});

		it('should handle partial transform UNCHANGEDs', function (done) {
			var called = 0;

			transformer = new Transformer([
				{
					el: mock,
					transforms: [
						['scale', function (actions) {
							return 2;
						}],
						['translate', function (i) {
							called++;
							return i;
						}, 'px']
					]
				}
			]);

			var startTransform;

			interval = setInterval(function () {
				if (called === 1) {
					startTransform = mock.style.transform;
					startTransform.should.equal('scale(2) translate(0px)');
				}

				if (called > 1) {
					clearInterval(interval);
					mock.style.transform.should.startWith('scale(2) translate(');
					mock.style.transform.should.not.equal(startTransform);
					done();
				}
			}, 5);
		});
	});

	describe('Custom variables', function () {
		it('should allow custom variables', function (done) {
			var lastI = -1;
			var called = 0;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (customI) {
							called++;
							lastI = customI;
						}]
					]
				}
			]);

			var i = 0;
			transformer.addVariable('customI', function () {
				return i++;
			});

			interval = setInterval(function () {
				(lastI + 1).should.equal(called);

				if (called > 3) {
					clearInterval(interval);
					done();
				}
			}, 5);
		});

		it('should only call transform function when changed', function (done) {
			var called = 0;
			var lastMock;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (mock) {
							called++;
							lastMock = mock;
						}]
					]
				}
			]);

			var mockVar = 10;
			transformer.addVariable('mock', function () {
				return mockVar;
			});

			interval = setInterval(function () {
				if (called === 1) {
					clearInterval(interval);

					lastMock.should.equal(10);

					setTimeout(function () {
						called.should.equal(1);

						mockVar = 25;

						interval = setInterval(function () {
							if (called === 2) {
								clearInterval(interval);

								lastMock.should.equal(25);

								setTimeout(function () {
									called.should.equal(2);

									done();
								}, 35);
							}
						}, 5);
					}, 35);
				}
			}, 5);
		});
	});

	describe('i increase rate', function () {
		it('should increase by 1 when fps is less than optimal and mode is "count"', function (done) {
			var called = 0;
			var lastI;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (i) {
							called++;
							lastI = i;
						}]
					]
				}
			]);

			transformer.iIncrease.optimalFps = 120;

			interval = setInterval(function () {
				if (called === 3) {
					clearInterval(interval);

					lastI.should.equal(2);

					done();
				}
			}, 5);
		});

		it('should increase by < 1 when fps is more than optimal and mode is "time"', function (done) {
			var called = 0;
			var lastI;

			transformer = new Transformer([
				{
					el: mock,
					styles: [
						['opacity', function (i) {
							called++;
							lastI = i;
						}]
					]
				}
			]);

			transformer.iIncrease.optimalFps = 20;

			interval = setInterval(function () {
				if (called === 3) {
					clearInterval(interval);

					lastI.should.be.within(1.2, 1.6);

					done();
				}
			}, 5);
		});
	});
});