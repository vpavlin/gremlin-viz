//var gremlin = require('gremlin-client');

function GremlinViz(host, port) {
    //
    this.nodeR = 10
    this.showEdgeLabels = true
    this.detailsElem = $("#details")
    this.graph = Viva.Graph.graph();
    this.client = gremlin.createClient(port, host)
    this.query = function(query) {
        console.log("Will search for "+query)
        var t = this
        var query = this.client.stream(query);
            // If playing with classic TinkerPop graph, will emit 6 data events 
        query.on('data', function(result) {
          // Handle first vertex  
            if (result.objects !== undefined) {
                t.drawMultiple(result)
            } else {
                t.drawOne(result)
            }
            t.render()
        });
         
        query.on('end', function() {
          console.log("All results fetched");
        });

        query.on('error', function(e) {
            console.log(e)
        });

        query.on('open', function() {
            console.log("Connection to Gremlin Server established!");
        });

        return query
    }

    this.layout = Viva.Graph.Layout.forceDirected(this.graph, {
                    springLength : 100,
                    springCoeff : 0.0008,
                    dragCoeff : 0.1,
                    gravity : -1.2,
                    springTransform: function (link, spring) {
                        spring.length = spring.length;
                    }
                });
    this.graphics = Viva.Graph.View.svgGraphics();
    this.setGraphics = function() {
        var t = this
        this.graphics.node(function(node) {
           // The function is called every time renderer needs a ui to display node
           var ui = Viva.Graph.svg('g')
           var rect = Viva.Graph.svg('circle')
                      .attr('r', t.nodeR)
                      .attr('fill', utils.getColor(node.data.ecosystem[0].value));
           var svgText = Viva.Graph.svg('text').text(utils.getName(node)).attr('y', (t.nodeR/2)+'px').attr('x', (t.nodeR+1)+'px')
           ui.append(rect)
           ui.append(svgText)

           $(ui).dblclick(function(e) {
               var backwards = false
               if (e.ctrlKey) { backwards = true; console.log("Backwards: "+backwards)}
               var q = t.queryNeighbors(utils.searchById(node.id), backwards)
               t.query(q)
           });

           $(ui).click(function(e) {
               t.fillDetails(node)
           })
           if (t.graph.getNodesCount() == 1) {
               t.layout.setNodePosition(node.id, 100, 100)
           }
           /*ui.addEventListener('click', function () {
               // toggle pinned mode
               t.layout.pinNode(node, !t.layout.isNodePinned(node));
           });*/

           return ui; // node.data holds custom object passed to graph.addNode();
        })
        .placeNode(function(nodeUI, pos){
            // Shift image to let links go to the center:
            //nodeUI.attr('x', pos.x - 12).attr('y', pos.y - 12);
            nodeUI.attr('transform',
                            'translate(' +
                                  (pos.x) + ',' + (pos.y) +
                            ')');
        });

        var createMarker = function(id) {
                    return Viva.Graph.svg('marker')
                               .attr('id', id)
                               .attr('viewBox', "0 0 10 10")
                               .attr('refX', "10")
                               .attr('refY', "5")
                               .attr('markerUnits', "strokeWidth")
                               .attr('markerWidth', "20")
                               .attr('markerHeight', "10")
                               .attr('orient', "auto");
                },
        marker = createMarker('Triangle');
        marker.append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z');
        // Marker should be defined only once in <defs> child element of root <svg> element:
        var defs = this.graphics.getSvgRoot().append('defs');
        defs.append(marker);
        var geom = Viva.Graph.geom();
        this.graphics.link(function(link){
            // Notice the Triangle marker-end attribe:
            var label = Viva.Graph.svg('text').attr('id','label_'+link.id).text(link.data);
            t.graphics.getSvgRoot().childNodes[0].append(label);
            return Viva.Graph.svg('path')
                       .attr('stroke', 'gray')
                       .attr('marker-end', 'url(#Triangle)').attr('id', link.id);
        }).placeLink(function(linkUI, fromPos, toPos) {
                // Here we should take care about
                //  "Links should start/stop at node's bounding box, not at the node center."
                // For rectangular nodes Viva.Graph.geom() provides efficient way to find
                // an intersection point between segment and rectangle
                var toNodeSize = t.nodeR,
                    fromNodeSize = t.nodeR;
                var from = geom.intersectRect(
                        // rectangle:
                                fromPos.x - fromNodeSize, // left
                                fromPos.y - fromNodeSize, // top
                                fromPos.x + fromNodeSize, // right
                                fromPos.y + fromNodeSize, // bottom
                        // segment:
                                fromPos.x, fromPos.y, toPos.x, toPos.y)
                           || fromPos; // if no intersection found - return center of the node
                var to = geom.intersectRect(
                        // rectangle:
                                toPos.x - toNodeSize, // left
                                toPos.y - toNodeSize, // top
                                toPos.x + toNodeSize, // right
                                toPos.y + toNodeSize, // bottom
                        // segment:
                                toPos.x, toPos.y, fromPos.x, fromPos.y)
                            || toPos; // if no intersection found - return center of the node
                var data = 'M' + from.x + ',' + from.y +
                           'L' + to.x + ',' + to.y;
                linkUI.attr("d", data);
               
                if (t.showEdgeLabels) {
                    document.getElementById("label_"+linkUI.attr('id'))
                    	.attr("x", (from.x + to.x) / 2)
                    	.attr("y", (from.y + to.y) / 2);
                }
            });
    }
    this.setGraphics()


    this.queryNeighbors = function(search, backwards) {
        var q = this.queryNode(search)
        if (backwards) {
            q += ".inE().outV().path()";
        } else {
            q += ".outE().inV().path()";
        }
        return q
    }

    this.queryNode = function(search) {
        var has = ""
        var q = ""
        if (search[0] !== undefined) {
            for (i in search) {
                o = search[i]
                has+=".has('"+o.property+"', '"+o.value+"')"
            }
            q = "g.V()"+has
        } else if (search.id !== undefined) {
            q = "g.V("+search.id+")"
        }

        return q
    }

    this.drawMultiple = function(result) {
            links = []
            //console.log(result.objects)
            for (i in result.objects) {
                o = result.objects[i]
                //console.log(o)
                if (o.type == "vertex") {
                    this.drawOne(o)
                } else {
                    links.push(o)
                }
            }

            for (l in links) {
                o = links[l]
                //console.log(o.outV+", "+o.inV+", "+o.label)
                this.graph.addLink(o.outV, o.inV, o.label)
            }
    }

    this.drawOne = function(result) {
        //console.log(result.id)
        this.graph.addNode(result.id, result.properties)
    }

    this.render = function() {
        this.renderer.run()
    }

    this.renderer = Viva.Graph.View.renderer(this.graph, {
      container: document.getElementById('graphDiv'),
      graphics: this.graphics,
      layout: this.layout
    });

    this.clear = function() {
        this.renderer.reset()
    }

    this.switchEdgeLabels = function(el) {
        console.log(el)
        this.showEdgeLabels = el
        this.graph.forEachLink(function(link) {
            if (el) {
                document.getElementById("label_"+link.id).style.display = "block"
            } else {
                document.getElementById("label_"+link.id).style.display = "none"
            }
        })
    }

    this.fillDetails = function(node) {
        var table = $("<table></table>")
        table.append($("<tr></tr>").html("<td>id</td><td>"+node.id+"</td>"))
        for (i in node.data) {
            var o = node.data[i]
            var td1 = $("<td></td>").html(i)
            var td2 = $("<td></td>").html(o[0].value)
            var tr = $("<tr></tr>").append(td1).append(td2)
            table.append(tr)
        }

        $(this.detailsElem).html(table)
    }
}

var utils = {
    getName: function(node) {
        console.log(node.data)
        return node.data.name[0].value
    },
    searchByName: function(name) {
        return this.searchByProperty("name", name)
    },
    searchByProperty: function(property, name) {
        var s = [
            {
                "property": property,
                "value": name
            }
        ]
        return s
    },
    searchByProperties: function(properties, names) {
        var s = []
        for (i in properties) {
            s.push(this.searchByProperty(properties[i], names[i])[0])
        }
        return s
    },
    searchById: function(id) {
        return {"id": id}
    },
    getEcosystems: function(client) {
        var q = client.stream("g.V().has('ecosystem').values('ecosystem').dedup()")
        q.on('data', function(result) {
            var option = $("<option></option>").text(result)
            $("#ecosystems").append(option)
        })
    },
    getColor: function(ecosystem) {
        var x = 0
        for (var i=0;i<ecosystem.length;i++) {
            x += ecosystem.charCodeAt(i)
        }
        var color = x.toString(16)
        return "#"+color.substr(0,3)
    }


}

$(document).ready(function() {
    var host="172.20.0.2"
    var port=8182
    //var host='gremlin-websocket-data-model.che.ci.centos.org'
    //var port=80
    
    var s1 = utils.searchByName("serve-static")
    var gv = new GremlinViz(host, port)
    utils.getEcosystems(gv.client)
    //var q1 = gv.queryNeighbors(s1)
    //var query = gv.query(q1)

    

    
    $("#search").click(function(e) {
        e.preventDefault()
        var properties = ["ecosystem", "name"]
        var values = [$("#ecosystems").val(), $("#value").val()]
        var s = utils.searchByProperties(properties, values)
        console.log(s)
        var q = gv.queryNode(s)

        gv.query(q)

    });
    $("#edgeLabels").click(function() {
        gv.switchEdgeLabels($(this).is(":checked"))

    })
     
    //var renderer = Viva.Graph.View.renderer(graph);
    
});
