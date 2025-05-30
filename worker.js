import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs";

let pyodide = await loadPyodide();

pyodide.FS.mkdirTree("/mnt");
pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, {}, "/mnt");

await pyodide.loadPackage("micropip");

await pyodide.runPythonAsync(`
    import micropip
    await micropip.install("numpy")
    await micropip.install("numpy-stl")
    await micropip.install("matplotlib")
    from pyodide.http import pyfetch
    response = await pyfetch("https://raw.githubusercontent.com/noahbagz/ShipD/refs/heads/main/HullParameterization.py")
    with open("HullParameterization.py", "wb") as f:
        f.write(await response.bytes())
`);

await pyodide.pyimport("HullParameterization");

postMessage(["startready", false]);

let currentTask;

self.onmessage = async (event) => {
    try {
        pyodide.runPython(`
        import numpy as np
        import json
        import os
        from HullParameterization import Hull_Parameterization as HP
        // json_data = json.loads(string_data)
        values_array = np.array([10,0.586419966,0.4,0.135031115,0.07663603,0.999810586,0.20580107,0.117658103,0.508608374,0.492447476,0.322423635,0.26,-0.8,0.1,0.523887622,-2.837267205,1.921090782,0.285951283,0.08804821,7.546176487,0,1,0,0.26,0.1,0,0,6.67026212,0.12262681,0.397121624,0.478015223,0,0,0.043140284,0.997551418,0.007784437,-0.984684081,0.166829894,0.323335968,0.004969256,1,0.572664826,0.118062528,-0.314184302,0.067689113])
        print(values_array)
        Hull = HP(values_array)
        constraints = Hull.input_Constraints()
        cons = constraints > 0
        print(sum(cons)) # should be zero
        mesh = Hull.gen_stl(NUM_WL=50, PointsPerWL=400, bit_AddTransom = 1, bit_AddDeckLid = 1, namepath = "/mnt/mesh")
        print(os.listdir('/mnt'))
        `);
        let result = pyodide.FS.readFile("/mnt/mesh.stl", {
            encoding: "binary",
        });
        console.log(result);
        console.log([result, false][0]);
        self.postMessage([result, false]);
    } catch (err) {
        let result = false;
        console.error("Error in worker:", err);
        self.postMessage(result);
    }
};
