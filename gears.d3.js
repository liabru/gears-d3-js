/**
* gears.d3.js
* http://brm.io/gears-d3-js/
*
* A d3.js example for creating simulated gear animations with SVG.
* 
* License: MIT
*/

(function($) {

    $(function () {
        $('.gears-d3-canvas').on('mousedown', function(e) {
            e.originalEvent.preventDefault();
        });

        main();
    });

    var allGears = [],
        changeInterval,
        canvasWidth = 800,
        canvasHeight = 600;

    function main() {
        var svg = d3.select('.gears-d3-canvas')
            .append('svg')
            .attr('viewBox', '0 0 ' + canvasWidth + ' ' + canvasHeight)
            .attr('preserveAspectRatio', 'xMinYMin slice');

        var xOffset = canvasWidth * 0.5,
            yOffset = canvasHeight * 0.5,
            holeRadius,
            teeth,
            radius,
            factor,
            newGear,
            gearFactors = [32, 48, 48, 64, 64, 96, 112],
            gearStyles = ['style-0', 'style-1', 'style-2', 'style-3', 'style-4'];

        var dragBehaviour = Gear.dragBehaviour(allGears, svg);

        dragBehaviour
            .on("dragstart.i", function() {
                clearTimeout(changeInterval);
            })
            .on("dragend.i", function() {
                clearTimeout(changeInterval);
            });

        gearStyles = gearStyles.shuffle();

        for (var i = 0; i < gearFactors.length * 2; i++) {
            factor = gearFactors[i % gearFactors.length];
            radius = factor / 2;
            teeth = radius / 4;
            holeRadius = factor > 96 ? radius * 0.5 : 20 * (radius / 96);

            allGears.push(newGear = Gear.create(svg, { 
                radius: radius, 
                teeth: teeth, 
                x: 0, 
                y: 0, 
                holeRadius: holeRadius 
            }));

            newGear.call(dragBehaviour);
            newGear.classed(gearStyles[i % gearStyles.length], true);
        }

        allGears = allGears.shuffle();
        Gear.randomArrange(allGears, xOffset, yOffset);
        Gear.updateGears(allGears);

        svg.selectAll('.gear')
            .attr('transform', function(d){
                return 'translate(' + [ d.x, d.y ] + ')';
            });

        changeInterval = setInterval(function() {
            allGears = allGears.shuffle();
            Gear.randomArrange(allGears, xOffset, yOffset);
            Gear.updateGears(allGears);

            svg.selectAll('.gear')
                .each(function(d, i) {
                    d3.select(this)
                        .transition()
                        .ease('elastic')
                        .delay(i * 80 + Math.random() * 80)
                        .duration(1500)
                        .attr('transform', function(d) {
                            return 'translate(' + [ d.x, d.y ] + ')';
                        });
                });
        }, 4000);

        d3.timer(function () {
            svg.selectAll('.gear-path')
                .attr('transform', function (d) {
                    d.angle += d.speed;
                    return 'rotate(' + d.angle * (180 / Math.PI) + ')';
                });
        });
    }

})(jQuery);


var Gear = {

    create: (function() {
        var gearId = 0;

        return function(svg, options) {
            var datum = {
                    teeth: Math.round(options.teeth) || 16,
                    radius: options.radius || 200,
                    x: options.x || 0,
                    y: options.y || 0,
                    speed: options.power || 0,
                    power: options.power || 0,
                    angle: options.angle || 0,
                    addendum: options.addendum || 8,
                    dedendum: options.dedendum || 3,
                    thickness: options.thickness || 0.7,
                    profileSlope: options.profileSlope || 0.5,
                    holeRadius: options.holeRadius || 5,
                    axisScale: options.axisScale || 1.5,
                    dragEvent: 'dragend',
                    id: gearId++
                };

            datum.rootRadius = datum.radius - datum.dedendum;
            datum.outsideRadius = datum.radius + datum.addendum;
            datum.circularPitch = (1 - datum.thickness) * 2 * Math.PI / datum.teeth;
            datum.pitchAngle = datum.thickness * 2 * Math.PI / datum.teeth;
            datum.slopeAngle = datum.pitchAngle * datum.profileSlope * 0.5;
            datum.addendumAngle = datum.pitchAngle * (1 - datum.profileSlope);

            var gear = svg.append('g')
                .attr('class', 'gear')
                .attr('transform', 'translate(' + datum.x + ', ' + datum.y + ')')
                .datum(datum);

            gear.on('mouseover', function() {
                var $this = d3.select(this);
                    $this.attr('transform', $this.attr('transform') + ' scale(1.06)');
            });

            gear.on('mouseout', function() {
                var $this = d3.select(this);
                    $this.attr('transform', $this.attr('transform').replace(' scale(1.06)', ''));
            });

            gear.append('path')
                .attr('class', 'gear-path')
                .attr('d', Gear.path);

            return gear;
        };
    })(),

    randomArrange: function(gears, xOffset, yOffset, angleMin, angleMax) {
        var xx = xOffset || 0,
            yy = yOffset || 0,
            angle = 0,
            prevGear,
            nextGear,
            distance,
            collision = false,
            unplacedGears,
            placedGears = [],
            randomPlaced,
            placed;

        // params
        angleMin = angleMin || 0.9;
        angleMax = angleMax || 1.2;

        // first clone and shuffle all the gears
        unplacedGears = gears.clone().shuffle();

        // power up the first one
        unplacedGears[0].datum().x = xx;
        unplacedGears[0].datum().y = yy;
        unplacedGears[0].datum().power = 0.01;

        // place the first gear
        placedGears.push(unplacedGears[0]);

        // try place the gears randomly
        // this is a bit hit and miss... but it mostly works

        // for every other gear
        for (var i = 1; i < unplacedGears.length; i++) {
            nextGear = unplacedGears[i].datum();
            randomPlaced = Math.floor(Math.random() * placedGears.length);
            placed = false;
            collision = 2;
            nextGear.power = 0;

            // try mesh to each placed gear until find one that works
            for (var j = 0; j < placedGears.length; j += 1) {
                if (placed === true)
                    break;

                // get the gear in question and find potential position to test
                prevGear = placedGears[(randomPlaced + j) % placedGears.length].datum();
                distance = prevGear.radius + nextGear.radius - nextGear.addendum;
                angle = Math.random() * 2 * Math.PI;

                // try at angular intervals around the gear in question
                // until we find an empty spot where we can place the gear (no collisions)
                for (var k = 0; k < 2 * Math.PI; k += 0.5) {
                    if (placed === true)
                        break;

                    nextGear.x = prevGear.x + Math.cos(angle + k) * distance;
                    nextGear.y = prevGear.y + Math.sin(angle + k) * distance;
                    collision = Gear.anyGearCollides(nextGear, placedGears, 10);

                    if (collision <= 1) {
                        Gear.mesh(prevGear, nextGear);
                        placedGears.push(unplacedGears[i]);
                        placed = true;
                    }
                }
            }

            // the above may fail on rare occasion
            // can't fit so ditch it!
            if (placed !== true) {
                nextGear.x = -100;
                nextGear.y = -100;
            }
        }
    },

    dragBehaviour: function(gears, svg) {
        return d3.behavior.drag()
                    .origin(function(d) { return d; })
                    .on('dragstart', function (d, i) {
                        d.dragEvent = 'dragstart';
                        d3.select(this).classed('dragging', true);
                        d3.select('body').classed('dragging', true);
                    })
                    .on('drag', function (d, i) {
                        var collision = false,
                            oldX = d.x,
                            oldY = d.y,
                            svgWidth = parseInt(svg.style('width'), 10),
                            svgHeight = parseInt(svg.style('height'), 10);

                        d.x = d3.event.x;
                        d.y = d3.event.y;
                        d.x = Math.max(d.radius, d.x);
                        d.y = Math.max(d.radius, d.y);

                        d.dragEvent = 'drag';
                        collision = Gear.anyGearCollides(d3.select(this).datum(), gears);

                        if (!collision) {
                            d3.select(this).attr('transform', function(d, i){
                                return 'translate(' + [ d.x, d.y ] + ')';
                            });

                            Gear.updateGears(gears);
                        } else {
                            d.x = oldX;
                            d.y = oldY;
                        }
                    })
                    .on('dragend', function (d, i) {
                        d.dragEvent = 'dragend';
                        d3.select(this).classed('dragging', false);
                        d3.select('body').classed('dragging', false);
                        Gear.updateGears(gears);
                    });
    },

    anyGearCollides: function(gearA, gears, tolerance) {
        var collisions = 0;
        tolerance = tolerance || 0;

        for (var i = 0; i < gears.length; i++) {
            var gearB = gears[i];

            if (Gear.gearCollides(gearA, gearB.datum(), tolerance))
                collisions += 1;
        }

        return collisions;
    },

    gearCollides: function(gearA, gearB, tolerance) {
        var threshold = gearA.radius + gearB.radius - Math.max(gearA.addendum, gearB.addendum) + tolerance;
                tolerance = tolerance || 0;
      
        if (gearA.id === gearB.id || 
            Math.abs(gearA.x - gearB.x) > threshold || 
            Math.abs(gearA.y - gearB.y) > threshold)
                return false;

        if (Utility.distanceSquared(gearA.x, gearA.y, gearB.x, gearB.y) < threshold * threshold)
            return true;

        return false;
    },

    propagateGears: function(gear, visited) {
        var connected = gear.connected;
      
        visited = visited || {};
        visited[gear.id] = true;

        for (var nextGearId in connected) {
            if (connected.hasOwnProperty(nextGearId)) {
                var nextGear = connected[nextGearId];

                if (nextGear.id === gear.id || nextGear.id in visited)
                    continue;

                visited[nextGear.id] = true;

                nextGear.speed -= gear.speed * (gear.teeth / nextGear.teeth);

                Gear.propagateGears(nextGear, visited);
            }
        }
    },

    updateGears: function(gears) {
        var gearA, 
            gearB,
            datum;
      
        for (var i = 0; i < gears.length; i += 1) {
            datum = gears[i].datum();
            datum.connected = {};
            datum.speed = datum.power;
        }

        for (i = 0; i < gears.length; i += 1) {
            for (var j = i + 1; j < gears.length; j += 1) {
                gearA = gears[i];
                gearB = gears[j];

                var datumA = gearA.datum(),
                    datumB = gearB.datum(),
                    collides = Gear.gearCollides(datumA, datumB, Math.max(datumA.addendum, + datumB.addendum));
              
                if (collides) {
                    datumA.connected[datumB.id] = datumB;
                    datumB.connected[datumA.id] = datumA;
                }
            }
        }

        for (i = 0; i < gears.length; i += 1) {
            gearA = gears[i];

            if (!gearA.classed('dragging'))
                continue;

            var nextGear = gearA.datum(),
                connectedKeys = Utility.keys(nextGear.connected);

            if (connectedKeys.length === 0)
                continue;  

            var gear = nextGear.connected[connectedKeys[0]];

            Gear.mesh(gear, nextGear);
        }

        var visited = {};

        for (i = 0; i < gears.length; i += 1) {
            datum = gears[i].datum();

            if (Math.abs(datum.power) > 0) {
                Gear.propagateGears(datum, visited);
            }
        }

        for (i = 0; i < gears.length; i += 1) {
            datum = gears[i].datum();
            if (Math.abs(datum.speed) > 0) {
                gears[i].classed('moving', true);
            } else {
                gears[i].classed('moving', false);
            }
        }
    },

    mesh: function(gear, nextGear) {
        var theta = Utility.angle(gear.x, gear.y, nextGear.x, nextGear.y),
            pitch = nextGear.circularPitch + nextGear.slopeAngle * 2 + nextGear.addendumAngle,
            radiusRatio = gear.radius / nextGear.radius;
        nextGear.angle = -(gear.angle % (2 * Math.PI)) * radiusRatio + theta + theta * radiusRatio + pitch * 0.5;
    },

    path: function(options) {
        var addendum = options.addendum || 10,
            dedendum = options.dedendum || 0,
            thickness = options.thickness || 0.7,
            profileSlope = options.profileSlope || 0.5,
            holeRadius = options.holeRadius || 5,
            teeth = options.teeth || 16,
            radius = (options.radius || 200) - addendum,
            rootRadius = radius - dedendum,
            outsideRadius = radius + addendum,
            circularPitch = (1 - thickness) * 2 * Math.PI / teeth,
            pitchAngle = thickness * 2 * Math.PI / teeth,
            slopeAngle = pitchAngle * profileSlope * 0.5,
            addendumAngle = pitchAngle * (1 - profileSlope),
            theta = (addendumAngle * 0.5 + slopeAngle),
            path = ['M', rootRadius * Math.cos(theta), ',', rootRadius * Math.sin(theta)];

        for(var i = 0; i < teeth; i++) {
            theta += circularPitch;

            path.push(
              'A', rootRadius, ',', rootRadius, ' 0 0,1 ', rootRadius * Math.cos(theta), ',', rootRadius * Math.sin(theta),
              'L', radius * Math.cos(theta), ',', radius * Math.sin(theta)
            );

            theta += slopeAngle;
            path.push('L', outsideRadius * Math.cos(theta), ',', outsideRadius * Math.sin(theta));
            theta += addendumAngle;
            path.push('A', outsideRadius, ',', outsideRadius, ' 0 0,1 ', outsideRadius * Math.cos(theta), ',', outsideRadius * Math.sin(theta));
            theta += slopeAngle;

            path.push(
                'L', radius * Math.cos(theta), ',', radius * Math.sin(theta),
                'L', rootRadius * Math.cos(theta), ',', rootRadius * Math.sin(theta)
            );
        }

        path.push('M0,', -holeRadius, 'A', holeRadius, ',', holeRadius, ' 0 0,0 0,', holeRadius, 'A', holeRadius, ',', holeRadius, ' 0 0,0 0,', -holeRadius, 'Z');

        return path.join('');
    }
};

var Utility = {
    keys: function(object) {
        if (Object.keys)
            return Object.keys(object);

        var keys = [];
        for (var key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
                keys.push(key);
            }
        }
        return keys;
    },

    distanceSquared: function(x1, y1, x2, y2) {
        var xs = x2 - x1,
            ys = y2 - y1;
        return (xs * xs) + (ys * ys);
    },

    angle: function(x1, y1, x2, y2) {
        var angle = Math.atan2(y2 - y1, x2 - x1);
        return angle > 0 ? angle : 2 * Math.PI + angle;
    },

    sign: function(x) {
        return x < 0 ? -1 : 1;
    }
};

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

Array.prototype.shuffle = function() {
    var array = this;
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

Array.prototype.clone = function() {
    return this.slice(0);
};