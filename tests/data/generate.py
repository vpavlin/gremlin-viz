from gremlin_python import statics
from gremlin_python.structure.graph import Graph
from gremlin_python.process.graph_traversal import __
from gremlin_python.process.strategies import *
from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection

if __name__ == "__main__":
    to = 100
    every_i = 9
    every_ii = every_i*2
    graph = Graph()
    g = graph.traversal().withRemote(DriverRemoteConnection('ws://gremlin-vasek.dev.rdu2c.fabric8.io', 'g'))
    
    ids = []
    for i in range(1, to+1):
        ret = g.addV("Version").property("name", str(i)).property("ecosystem", "npm").toList()
        print(i)
        ids.append(ret[0].id)
        if i % every_i == 0:
            for j in range(0, 8):
                g.V(ids[-1]).addE("depends_on").to(g.V(ids[i-every_i+j])).toList()
    for i in range(1, int(to/every_i)):
        print(ids[-1])
        g.V(ids[-1]).addE("is_parent_of").to(g.V(ids[i*every_i-1])).toList()
        print(i*every_i)
