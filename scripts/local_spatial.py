"""Spatially select one city's candidates, preserving overlapping subarea evidence."""
from shapely import STRtree, covers, points, prepare
from shapely.geometry import shape


def select_businesses(candidates, polygon, areas):
    if not candidates:
        return []
    prepare(polygon)
    locations = points([e['lon'] for e in candidates], [e['lat'] for e in candidates])
    inside = covers(polygon, locations)
    selected = [e for e, keep in zip(candidates, inside) if keep]
    if not selected:
        return []
    memberships = [[] for _ in selected]
    if areas:
        tree = STRtree([shape(a['geometry']) for a in areas])
        # A point intersects a polygon exactly when that polygon covers it,
        # including its boundary. Keep every overlapping district/barangay.
        pairs = tree.query(points([e['lon'] for e in selected], [e['lat'] for e in selected]), predicate='intersects')
        for element_index, area_index in zip(*pairs):
            memberships[int(element_index)].append(int(area_index))
    result = []
    for element, matched in zip(selected, memberships):
        tags = dict(element['tags'])
        matched.sort()  # Preserve the former source-order assignment of tags.
        for i in matched:
            tags['scanner:osm_' + areas[i]['kind']] = areas[i]['name']
        result.append({**element, 'tags': tags, 'areaIds': [areas[i]['id'] for i in matched]})
    return result
