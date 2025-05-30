/* The following functions have as objective to integrate
the hull mesh from the ShipD library with Three.js/Vessel3D library.
The createHullMeshFromPoints is a refactor from the ShipD library using
the Three.js library to create a hull mesh instead of the numpy-stl library
for a better integration with the browser.
*/

import * as THREE from "https://cdn.skypack.dev/three@0.132.2";

function createHullMeshFromPoints(waterlines) {
    /*    waterlines: Array of waterlines where p[i][j] = [x, y, z] arrays.
     */

    const triangles = []; // Will hold each triangle as an array of 3 vertices
    const numWaterlines = waterlines.length;

    for (let wlIndex = 0; wlIndex < numWaterlines - 1; wlIndex++) {
        const currentWL = waterlines[wlIndex];
        const nextWL = waterlines[wlIndex + 1];

        // Extract bow (first x) and stern (last x) coordinates for each WL
        const firstCurrentX = currentWL[0][0];
        const firstNextX = nextWL[0][0];
        const lastCurrentX = currentWL[currentWL.length - 1][0];
        const lastNextX = nextWL[nextWL.length - 1][0];

        /* Check if the waterline is in a top of a bulbous bow or stern bow
        This region is the one where the first x is less than the next x
        and the last x is greater than the next x. Similarly, the stern
        is the region where the last x is greater than the last next x.
        */
        const isBulbousBow = firstCurrentX < firstNextX;
        const isBulbousStern = lastCurrentX > lastNextX;

        // These indices define where the overlapping x-ranges begin and end
        let idxBowCurrent, idxBowNext, idxSternCurrent, idxSternNext;

        // --- Find matching bow points (start of overlap) ---
        if (isBulbousBow) {
            idxBowNext = 1;
            idxBowCurrent = currentWL.findIndex(
                (p) => p[0] === nextWL[idxBowNext][0]
            );
        } else {
            idxBowCurrent = 1;
            idxBowNext = nextWL.findIndex(
                (p) => p[0] === currentWL[idxBowCurrent][0]
            );
        }

        // --- Find matching stern points (end of overlap) ---
        if (isBulbousStern) {
            idxSternNext = nextWL.length - 2;
            idxSternCurrent = currentWL.findIndex(
                (p) => p[0] === nextWL[idxSternNext][0]
            );
        } else {
            idxSternCurrent = currentWL.length - 2;
            idxSternNext = nextWL.findIndex(
                (p) => p[0] === currentWL[idxSternCurrent][0]
            );
        }

        // --- Build Bow Section Triangles ---
        if (isBulbousBow) {
            triangles.push([nextWL[idxBowNext], currentWL[0], nextWL[0]]);
            for (let j = 0; j < idxBowCurrent; j++) {
                triangles.push([
                    nextWL[idxBowNext],
                    currentWL[j + 1],
                    currentWL[j],
                ]);
            }
        } else {
            for (let j = 0; j < idxBowNext; j++) {
                triangles.push([currentWL[0], nextWL[j], nextWL[j + 1]]);
            }
            triangles.push([
                currentWL[0],
                nextWL[idxBowNext],
                currentWL[idxBowCurrent],
            ]);
        }

        // --- Build Midsection Triangles ---
        const spanLength = idxSternNext - idxBowNext;
        for (let j = 0; j < spanLength; j++) {
            const pt00 = currentWL[idxBowCurrent + j];
            const pt01 = currentWL[idxBowCurrent + j + 1];
            const pt10 = nextWL[idxBowNext + j];
            const pt11 = nextWL[idxBowNext + j + 1];

            triangles.push([pt00, pt10, pt11]);
            triangles.push([pt00, pt11, pt01]);
        }

        // --- Build Stern Section Triangles ---
        if (isBulbousStern) {
            for (let j = idxSternCurrent; j < currentWL.length - 1; j++) {
                triangles.push([
                    nextWL[idxSternNext],
                    currentWL[j + 1],
                    currentWL[j],
                ]);
            }
            triangles.push([
                nextWL[idxSternNext],
                nextWL[nextWL.length - 1],
                currentWL[currentWL.length - 1],
            ]);
        } else {
            triangles.push([
                currentWL[idxSternCurrent],
                nextWL[idxSternNext],
                currentWL[currentWL.length - 1],
            ]);
            for (let j = idxSternNext; j < nextWL.length - 1; j++) {
                triangles.push([
                    currentWL[currentWL.length - 1],
                    nextWL[j],
                    nextWL[j + 1],
                ]);
            }
        }
    }

    // Convert triangle list to Three.js geometry
    const positionArray = [];
    triangles.forEach((tri) => {
        tri.forEach((vertex) => {
            positionArray.push(...vertex); // Flatten [x, y, z]
        });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionArray, 3)
    );
    geometry.computeVertexNormals(); // For shading

    const material = new THREE.MeshStandardMaterial({
        color: 0x6699ff,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

function returnHullVessel3DFormation(waterlines) {
    /* waterlines: Array of waterlines where p[i][j] = [x, y, z] arrays.

    returns: the hull shape compatible for vessel3D library in the vesseljs format.
     */
    const numberWaterLines = waterlines.length;
    const numberOfFramePoints = waterlines[numberWaterLines - 1].length;
    const lastWaterLine = waterlines[numberWaterLines - 1];
    const extremePoints = lastWaterLine[numberOfFramePoints - 1];

    const shipLength = extremePoints[0]; // index 0 is the bow x coordinate
    const shipBeam = Math.max(...extremePoints.map((point) => point[1]));
    const shipDraft = extremePoints[2]; // index 2 is the draft

    const hull = {};
    hull.halfBreadths = {
        waterlines: [],
        stations: [],
        table: [],
    };

    // INFO: Consider the deck line containing all the stations, this might not be true if
    // the hull is bigger than the deck line.
    hull.halfBreadths.stations = lastWaterLine.map(
        (point) => point[0] / shipLength
    ); // normalized x-coordinates
    hull.halfBreadths.waterlines = waterlines.map((wl) => wl[0][2] / shipDraft); // normalized z-coordinates
    debugger;

    for (let i = 0; i < numberWaterLines; i++) {
        const waterline = waterlines[i].map((point) => point / shipBeam); // Normalize y-coordinates
        hull.halfBreadths.table.push([]); // Initialize an empty array for this waterline

        for (let j = 0; j < hull.halfBreadths.stations.length; j++) {
            // Check if the breadth if the first breadth is smaller than the first breadth
            // in the waterline, if so, add null to the table.
            if (hull.halfBreadths.stations[j] < waterline[0][0]) {
                hull.halfBreadths.table[i].push(null);
                continue;
            }

            if (
                hull.halfBreadths.stations[j] >
                waterline[waterline.length - 1][0]
            ) {
                hull.halfBreadths.table[i].push(null);
                continue;
            }

            // Find the index of the station in the waterline
            // id = waterline.findIndex(
            //     (point) => point[0] === hull.halfBreadths.stations[j]
            // );
            // hull.halfBreadths.table[i].push()
        }
    }

    return hull;
}

export { createHullMeshFromPoints, returnHullVessel3DFormation };
