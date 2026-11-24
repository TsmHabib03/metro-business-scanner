import pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'.local-tools'),str(ROOT/'scripts')]
from shapely.geometry import box,mapping,Point,shape
from local_spatial import select_businesses

class SpatialTest(unittest.TestCase):
    def test_exact_boundaries_overlap_and_outside(self):
        polygon=box(0,0,2,2)
        areas=[{'id':1,'name':'District','kind':'district','geometry':mapping(box(0,0,2,2))},
               {'id':2,'name':'Barangay A','kind':'barangay','geometry':mapping(box(0,0,1,2))},
               {'id':3,'name':'Barangay B','kind':'barangay','geometry':mapping(box(1,0,2,2))}]
        candidates=[{'id':i,'lon':x,'lat':y,'tags':{'name':'Fixture'}} for i,(x,y) in enumerate([(0,0),(1,1),(1.5,1),(5,5)])]
        result=select_businesses(candidates,polygon,areas)
        self.assertEqual([e['id'] for e in result],[0,1,2])
        for element in result:
            expected=[a['id'] for a in areas if shape(a['geometry']).covers(Point(element['lon'],element['lat']))]
            self.assertEqual(element['areaIds'],expected)
        self.assertEqual(result[1]['areaIds'],[1,2,3])
        self.assertEqual(result[1]['tags']['scanner:osm_barangay'],'Barangay B')
        self.assertNotIn('scanner:osm_barangay',candidates[1]['tags'])
    def test_empty_and_no_subareas(self):
        self.assertEqual(select_businesses([],box(0,0,1,1),[]),[])
        self.assertEqual(select_businesses([{'id':1,'lon':.5,'lat':.5,'tags':{}}],box(0,0,1,1),[])[0]['areaIds'],[])

if __name__=='__main__':unittest.main()
