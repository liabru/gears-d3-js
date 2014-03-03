/**
* gears-demo.js
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
        _gearFactors = [32, 48, 48, 64, 64, 96, 112, 256],
        _gearStyles = ['style-0', 'style-1', 'style-2', 'style-3', 'style-4'],
        _autoShuffle = true,
        _dragBehaviour;

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
                clearTimeout(_randomiseInterval);
            })
            .on("dragend.i", function() {
                clearTimeout(_randomiseInterval);
            });

        // generate and randomise scene
        _generateScene(_gearFactors.length * 2);
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

    var _generateScene = function(number) {
        var holeRadius,
            teeth,
            radius,
            factor,
            newGear;
        
        _gearStyles = Gear.Utility.arrayShuffle(_gearStyles);

        for (var i = 0; i < number; i++) {
            factor = _gearFactors[i % _gearFactors.length];
            radius = factor / 2;
            teeth = radius / 4;
            holeRadius = factor > 96 ? radius * 0.5 : 20 * (radius / 96);

            _allGears.push(newGear = Gear.create(_svg, { 
                radius: radius, 
                teeth: teeth, 
                x: 0, 
                y: 0, 
                holeRadius: holeRadius 
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

        var datGui = new dat.GUI();
        
        var gui = {
            datGui: datGui,
            radius: 16,
            holeRadius: 4,
            transition: true,
            speed: 0.01,
            autoShuffle: true,
            number: 10
        };

        var funcs = {
            randomise: function() {
                _clear();
                _generateScene(gui.number);
                _randomiseScene(false);
            },

            shuffle: function() {
                _randomiseScene(true);
            },

            updateSpeed: function(speed) {
                $.each(_allGears, function() {
                    var datum = this.datum();
                    if (datum.power !== 0)
                        datum.power = speed;
                });

                Gear.updateGears(_allGears);
            }
        };

        var controls = datGui.addFolder('Gears');

        controls.add(gui, 'number', 1, 50)
            .onFinishChange(function() {
                _scrollToDemo();
                funcs.randomise();
            });

        controls.add(gui, 'speed', 0.001, 0.2)
            .step(0.001)
            .onChange(function(speed) {
                _scrollToDemo();
                funcs.updateSpeed(speed);
            });

        controls.add(funcs, 'shuffle')
            .onChange(function() {
                _scrollToDemo();
            });

        controls.add(funcs, 'randomise')
            .onChange(function() {
                _scrollToDemo();
            });

        controls.add(gui, 'autoShuffle')
            .onChange(function(val) {
                _scrollToDemo();
                _autoShuffle = val;
            });

        controls.open();

        return gui;
    };

})(jQuery);