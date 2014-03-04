/**
* gear-toy.js
* http://brm.io/gears-d3-js/
* License: MIT
*/

(function($) {

    var _svg,
        _allGears = [],
        _randomiseInterval,
        _canvasWidth = 1024,
        _canvasHeight = 768,
        _xOffset = _canvasWidth * 0.5,
        _yOffset = _canvasHeight * 0.5,
        _gearFactors = [64, 64, 32, 48, 48, 96, 112, 256],
        _gearStyles = ['style-0', 'style-1', 'style-2', 'style-3', 'style-4'],
        _autoShuffle = true,
        _dragBehaviour;

    var _options = {
        radius: 16,
        holeRadius: 0.4,
        transition: true,
        speed: 0.01,
        autoShuffle: true,
        number: 10,
        addendum: 8,
        dedendum: 3,
        thickness: 0.7,
        profileSlope: 0.5
    };

    $(function () {
        // prevent canvas doing odd things on click
        $('.gears-d3-canvas').on('mousedown', function(e) {
            e.originalEvent.preventDefault();
        });

        // start the demo
        main();
        _initGui();

        // for ie css fix
        var isIE = window.ActiveXObject || "ActiveXObject" in window;
        if (isIE)
            $('body').addClass('ie');
    });

    function main() {

        // set up our d3 svg element
        _svg = d3.select('.gears-d3-canvas')
            .append('svg')
            .attr('viewBox', '0 0 ' + _canvasWidth + ' ' + _canvasHeight)
            .attr('preserveAspectRatio', 'xMinYMin slice');

        // get a d3 dragBehaviour using Gear helper
        _dragBehaviour = Gear.dragBehaviour(_allGears, _svg);

        // extend the dragbehaviour to disable randomise while dragging
        _dragBehaviour
            .on("dragstart.i", function() {
                _autoShuffle = false;
            })
            .on("dragend.i", function() {
                _autoShuffle = false;
            });

        // generate and randomise scene
        _generateScene(_options);
        _randomiseScene(false);

        // start a timer to randomise every few secs
        _randomiseInterval = setInterval(function() {
            if (_autoShuffle)
                _randomiseScene(true);
        }, 4000);

        // start the d3 animation timer
        d3.timer(function () {
            _svg.selectAll('.gear-path')
                .attr('transform', function (d) {
                    d.angle += d.speed;
                    return 'rotate(' + d.angle * (180 / Math.PI) + ')';
                });
        });
    }

    var _generateScene = function(options) {
        var holeRadius,
            teeth,
            radius,
            factor,
            newGear,
            innerRadius;
        
        _gearStyles = Gear.Utility.arrayShuffle(_gearStyles);

        for (var i = 0; i < options.number; i++) {
            factor = _gearFactors[i % _gearFactors.length];
            radius = factor / 2;
            teeth = radius / 4;
            innerRadius = radius - options.addendum - options.dedendum;
            holeRadius = factor > 96 ? innerRadius * 0.5 + innerRadius * 0.5 * options.holeRadius : innerRadius * options.holeRadius;

            _allGears.push(newGear = Gear.create(_svg, { 
                radius: radius, 
                teeth: teeth, 
                x: 0, 
                y: 0, 
                holeRadius: holeRadius,
                addendum: options.addendum,
                dedendum: options.dedendum,
                thickness: options.thickness,
                profileSlope: options.profileSlope
            }));

            newGear.call(_dragBehaviour);
            newGear.classed(_gearStyles[i % _gearStyles.length], true);
        }
    };

    var _randomiseScene = function(transition) {
        _allGears = Gear.Utility.arrayShuffle(_allGears);
        Gear.randomArrange(_allGears, _xOffset, _yOffset);
        Gear.setPower(_allGears[0], 0.01);
        Gear.updateGears(_allGears);

        _svg.selectAll('.gear')
            .each(function(d, i) {
                if (transition) {
                    d3.select(this)
                        .transition()
                        .ease('elastic')
                        .delay(i * 80 + Math.random() * 80)
                        .duration(1500)
                        .attr('transform', function(d) {
                            return 'translate(' + [ d.x, d.y ] + ')';
                        });
                } else {
                    d3.select(this)
                        .attr('transform', function(d) {
                            return 'translate(' + [ d.x, d.y ] + ')';
                        });
                }
            });
    };

    var _clear = function() {
        // clear the array and keep the original reference!
        _allGears.length = 0;
        _svg.selectAll('.gear').remove();
    };

    var _scrollToDemo = function() {
        $('html, body')
            .stop()
            .animate({
                scrollTop: $(".gears-d3-canvas").offset().top
            }, 200);
    };

    var _initGui = function() {
        if (!window.dat) {
            console.log("Could not create GUI. Check dat.gui library is loaded first.");
            return;
        }

        _options.datGui = new dat.GUI();

        var funcs = {
            randomise: function() {
                funcs.randomiseSettings();
                funcs.randomiseScene();
            },

            randomiseSettings: function() {
                _options.addendum = 2 + Math.random() * 6;
                _options.dedendum = 2 + Math.random() * 2;
                _options.thickness = 0.5 + Math.random() * 0.1;
                _options.profileSlope = _options.thickness * 0.9;
                _options.holeRadius = Math.random() * 0.9;
                _updateGui(_options.datGui);
            },

            randomiseScene: function() {
                _clear();

                _generateScene(_options);
                _randomiseScene(false);
                _scrollToDemo();
                _autoShuffle = false;
            },

            shuffle: function() {
                _randomiseScene(true);
                _scrollToDemo();
                _autoShuffle = false;
            },

            updateSpeed: function(speed) {
                $.each(_allGears, function() {
                    var datum = this.datum();
                    if (datum.power !== 0)
                        datum.power = speed;
                });

                Gear.updateGears(_allGears);
                _autoShuffle = false;
                _scrollToDemo();
            },

            onFinishChange: function() {
                funcs.randomiseScene();
                _autoShuffle = false;
            }
        };

        var controls = _options.datGui.addFolder('Gears');

        controls.add(_options, 'number', 1, 50).onFinishChange(funcs.onFinishChange);
        controls.add(_options, 'holeRadius', 0, 0.9).onFinishChange(funcs.onFinishChange);
        controls.add(_options, 'addendum', 0, 16).onFinishChange(funcs.onFinishChange);
        controls.add(_options, 'dedendum', 0, 16).onFinishChange(funcs.onFinishChange);
        controls.add(_options, 'thickness', 0, 0.8).onFinishChange(funcs.onFinishChange);
        controls.add(_options, 'profileSlope', 0, 0.8).onFinishChange(funcs.onFinishChange);

        controls.add(_options, 'speed', 0.001, 0.2)
            .step(0.001)
            .onChange(function(speed) {
                funcs.updateSpeed(speed);
            });

        controls.add(funcs, 'shuffle');
        controls.add(funcs, 'randomise');

        controls.open();
    };

    var _updateGui = function(datGui) {
        var i;
        
        for (i in datGui.__folders) {
            _updateGui(datGui.__folders[i]);
        }
        
        for (i in datGui.__controllers) {
            var controller = datGui.__controllers[i];
            if (controller.updateDisplay)
                controller.updateDisplay();
        }
     };

})(jQuery);