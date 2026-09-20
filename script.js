const canvas = document.getElementById("brainCanvas");
const ctx = canvas.getContext("2d");

const neuronsFiredText =
    document.getElementById("neuronsFired");

const connectionsUsedText =
    document.getElementById("connectionsUsed");

const simulationTimeText =
    document.getElementById("simulationTime");

const responseText =
    document.getElementById("response");

const startBtn =
    document.getElementById("startBtn");

const pauseBtn =
    document.getElementById("pauseBtn");

const resetBtn =
    document.getElementById("resetBtn");

const speedSlider =
    document.getElementById("speedSlider");


// ========================================
// FLYWIRE DATASETS
// ========================================

const stimulusConfig = {

    sugar: {
        file: "brain.json",
        startNeuron: "GNG.1981",
        response: "🍬 APPROACH FOOD"
    },

    smell: {
        file: "smell.json",
        startNeuron: "AL.2223",
        response: "🌸 DETECT ODOR"
    },

    light: {
        file: "light.json",
        startNeuron: "ME.41550",
        response: "☀️ DETECT LIGHT"
    },

    touch: {
        file: "touch.json",
        startNeuron: "GNG.3066",
        response: "✋ RESPOND TO TOUCH"
    }

};


// ========================================
// CURRENT DATA
// ========================================

let brainData = null;

let neurons = [];
let connections = [];

let activeSignals = [];

let selectedStimulus = null;

let running = false;
let simulationTime = 0;

let neuronsFired = 0;
let connectionsUsed = 0;

let firedNeuronIds = new Set();

let activeConnectionKeys = new Set();

let simulationRun = 0;


// ========================================
// LOAD ALL FLYWIRE DATA
// ========================================

async function loadBrain() {

    try {

        responseText.textContent =
            "Loading FlyWire data...";

        const currentStimulus =
            selectedStimulus || "sugar";

        const file =
            stimulusConfig[currentStimulus].file;

        const response =
            await fetch(file);

        if (!response.ok) {

            throw new Error(
                `${file} could not be loaded`
            );

        }

        brainData =
            await response.json();

        buildRealNetwork();

        console.log(
            "Loaded:",
            file
        );

    }

    catch (error) {

        console.error(
            "Could not load FlyWire data:",
            error
        );

        responseText.textContent =
            "Could not load FlyWire data";

    }

}


// ========================================
// LOAD DATASET FOR SELECTED STIMULUS
// ========================================

async function loadStimulusData(stimulus) {

    try {

        running = false;

        activeSignals = [];

        firedNeuronIds.clear();

        activeConnectionKeys.clear();

        neuronsFired = 0;

        connectionsUsed = 0;

        simulationTime = 0;

        neuronsFiredText.textContent = "0";

        connectionsUsedText.textContent = "0";

        simulationTimeText.textContent =
            "0.00 s";

        responseText.textContent =
            "Loading neural pathway...";


        const config =
            stimulusConfig[stimulus];


        const response =
            await fetch(config.file);


        if (!response.ok) {

            throw new Error(
                `${config.file} could not be loaded`
            );

        }


        brainData =
            await response.json();


        buildRealNetwork();


        console.log(
            "================================="
        );

        console.log(
            "STIMULUS:",
            stimulus
        );

        console.log(
            "DATASET:",
            config.file
        );

        console.log(
            "STARTING NEURON:",
            config.startNeuron
        );

        console.log(
            "================================="
        );


        startSimulation();

    }

    catch (error) {

        console.error(
            error
        );

        responseText.textContent =
            "Could not load this FlyWire pathway";

    }

}


// ========================================
// BUILD REAL NETWORK
// ========================================

function buildRealNetwork() {

    neurons = [];
    connections = [];


    const nodeData =
        brainData.network.nodes;

    const edgeData =
        brainData.network.edges;


    // ------------------------------------
    // CREATE REAL NEURONS
    // ------------------------------------

    Object.entries(nodeData).forEach(
        ([id, data]) => {

            neurons.push({

                id: String(id),

                name:
                    data.name || String(id),

                ntType:
                    data.nt_type || "Unknown",

                className:
                    data.class || "unknown",

                x: 0,
                y: 0,

                active: false

            });

        }
    );


    // ------------------------------------
    // CREATE REAL CONNECTIONS
    // ------------------------------------

    edgeData.forEach(
        edge => {

            connections.push({

                fromRaw:
                    edge.from,

                toRaw:
                    edge.to,

                from:
                    String(edge.from),

                to:
                    String(edge.to),

                synapses:
                    edge.synapses || 0,

                ntType:
                    edge.nt_type || "Unknown"

            });

        }
    );


    // ------------------------------------
    // REMOVE DUPLICATES
    // ------------------------------------

    const uniqueConnections =
        new Map();


    connections.forEach(
        connection => {

            const key =
                `${connection.fromRaw}_${connection.toRaw}`;


            if (
                !uniqueConnections.has(key)
            ) {

                uniqueConnections.set(
                    key,
                    connection
                );

            }

        }
    );


    connections =
        Array.from(
            uniqueConnections.values()
        );


    positionNetwork();


    console.log(
        "Real FlyWire neurons:",
        neurons.length
    );


    console.log(
        "Real FlyWire connections:",
        connections.length
    );

}


// ========================================
// MATCH FLYWIRE IDS SAFELY
// ========================================

function sameFlyWireId(id1, id2) {

    if (
        String(id1) ===
        String(id2)
    ) {

        return true;

    }


    try {

        return Number(id1) ===
               Number(id2);

    }

    catch {

        return false;

    }

}


// ========================================
// FIND NEURON
// ========================================

function getNeuron(id) {

    return neurons.find(
        neuron =>
            sameFlyWireId(
                neuron.id,
                id
            )
    );

}


// ========================================
// FIND OUTGOING CONNECTIONS
// ========================================

function findOutgoingConnections(
    neuron
) {

    return connections.filter(
        connection =>
            sameFlyWireId(
                connection.fromRaw,
                neuron.id
            )
    );

}


// ========================================
// POSITION NETWORK
// ========================================

function positionNetwork() {

    const width =
        canvas.width;

    const height =
        canvas.height;


    const config =
        stimulusConfig[
            selectedStimulus || "sugar"
        ];


    const startingNeuron =
        neurons.find(
            neuron =>
                neuron.name ===
                config.startNeuron
        );


    // ------------------------------------
    // STARTING NEURON
    // ------------------------------------

    if (startingNeuron) {

        startingNeuron.x = 100;

        startingNeuron.y =
            height / 2;

    }


    // ------------------------------------
    // OTHER NEURONS
    // ------------------------------------

    const otherNeurons =
        neurons.filter(
            neuron =>
                !startingNeuron ||
                neuron.id !==
                startingNeuron.id
        );


    const columns = 3;


    otherNeurons.forEach(
        (neuron, index) => {

            const column =
                index % columns;

            const row =
                Math.floor(
                    index / columns
                );


            neuron.x =
                width * 0.42 +
                column * 180;


            neuron.y =
                70 +
                row * 100;

        }
    );

}


// ========================================
// DRAW CONNECTIONS
// ========================================

function drawConnections() {

    connections.forEach(
        connection => {

            const from =
                getNeuron(
                    connection.fromRaw
                );

            const to =
                getNeuron(
                    connection.toRaw
                );


            if (!from || !to) {
                return;
            }


            const key =
                `${connection.fromRaw}_${connection.toRaw}`;


            const isActive =
                activeConnectionKeys.has(key);


            ctx.beginPath();


            ctx.moveTo(
                from.x,
                from.y
            );


            ctx.lineTo(
                to.x,
                to.y
            );


            // --------------------------------
            // ACTIVE CONNECTION
            // --------------------------------

            if (isActive) {

                ctx.shadowBlur = 6;

                ctx.shadowColor =
                    "#55e6ff";

                ctx.strokeStyle =
                    "rgba(85, 230, 255, 0.30)";

                ctx.lineWidth = 2;

            }


            // --------------------------------
            // NORMAL CONNECTION
            // --------------------------------

            else {

                const opacity =
                    Math.min(
                        0.45,
                        0.08 +
                        connection.synapses / 300
                    );


                ctx.shadowBlur = 0;

                ctx.strokeStyle =
                    `rgba(70,160,190,${opacity})`;

                ctx.lineWidth = 1;

            }


            ctx.stroke();

            ctx.shadowBlur = 0;

        }
    );

}


// ========================================
// DRAW NEURONS
// ========================================

function drawNeurons() {

    neurons.forEach(
        neuron => {

            ctx.beginPath();


            const radius =
                neuron.active
                    ? 11
                    : 6;


            ctx.arc(
                neuron.x,
                neuron.y,
                radius,
                0,
                Math.PI * 2
            );


            if (neuron.active) {

                ctx.shadowBlur = 30;

                ctx.shadowColor =
                    "#55e6ff";

                ctx.fillStyle =
                    "#55e6ff";

            }

            else {

                ctx.shadowBlur = 0;


                if (
                    neuron.ntType ===
                    "ACH"
                ) {

                    ctx.fillStyle =
                        "#55a9ff";

                }

                else if (
                    neuron.ntType ===
                    "GABA"
                ) {

                    ctx.fillStyle =
                        "#c28cff";

                }

                else if (
                    neuron.ntType ===
                    "GLUT"
                ) {

                    ctx.fillStyle =
                        "#72d66b";

                }

                else {

                    ctx.fillStyle =
                        "#42606d";

                }

            }


            ctx.fill();

            ctx.shadowBlur = 0;

        }
    );

}


// ========================================
// DRAW MOVING SIGNAL
// ========================================

function drawSignals() {

    activeSignals.forEach(
        signal => {

            ctx.beginPath();


            ctx.arc(
                signal.x,
                signal.y,
                5,
                0,
                Math.PI * 2
            );


            ctx.shadowBlur = 25;

            ctx.shadowColor =
                "#ffffff";

            ctx.fillStyle =
                "#ffffff";

            ctx.fill();

            ctx.shadowBlur = 0;

        }
    );

}


// ========================================
// FIRE NEURON
// ========================================

function fireNeuron(neuron) {

    if (!neuron) {
        return;
    }


    // Prevent repeated firing

    if (
        firedNeuronIds.has(
            neuron.id
        )
    ) {

        return;

    }


    firedNeuronIds.add(
        neuron.id
    );


    neuron.active = true;


    // ------------------------------------
    // UPDATE FIRED COUNT
    // ------------------------------------

    neuronsFired =
        firedNeuronIds.size;


    neuronsFiredText.textContent =
        neuronsFired;


    // ------------------------------------
    // TURN GLOW OFF
    // ------------------------------------

    setTimeout(
        () => {

            neuron.active = false;

        },

        600 /
        Number(
            speedSlider.value
        )

    );


    // ------------------------------------
    // FIND REAL CONNECTIONS
    // ------------------------------------

    const outgoing =
        findOutgoingConnections(
            neuron
        );


    console.log(
        "⚡",
        neuron.name,
        "→",
        outgoing.length,
        "real connections"
    );


    // ------------------------------------
    // SEND SIGNALS
    // ------------------------------------

    outgoing.forEach(
        (connection, index) => {

            setTimeout(
                () => {

                    sendSignal(
                        connection
                    );

                },

                (
                    300 /
                    Number(
                        speedSlider.value
                    )
                )
                +
                (
                    index * 80
                )

            );

        }
    );

}


// ========================================
// SEND SIGNAL
// ========================================

function sendSignal(connection) {

    const from =
        getNeuron(
            connection.fromRaw
        );

    const to =
        getNeuron(
            connection.toRaw
        );


    if (!from || !to) {
        return;
    }


    // ------------------------------------
    // UPDATE CONNECTION COUNT
    // ------------------------------------

    connectionsUsed++;


    connectionsUsedText.textContent =
        connectionsUsed;


    // ------------------------------------
    // ACTIVATE CONNECTION
    // ------------------------------------

    const connectionKey =
        `${connection.fromRaw}_${connection.toRaw}`;


    activeConnectionKeys.add(
        connectionKey
    );


    // ------------------------------------
    // CREATE SIGNAL
    // ------------------------------------

    const signal = {

        connection:
            connection,

        x:
            from.x,

        y:
            from.y,

        progress: 0

    };


    activeSignals.push(
        signal
    );


    const travelTime =
        800 /
        Number(
            speedSlider.value
        );


    const startTime =
        performance.now();


    function moveSignal(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        signal.progress =
            elapsed /
            travelTime;


        // --------------------------------
        // REACHED DESTINATION
        // --------------------------------

        if (
            signal.progress >= 1
        ) {

            signal.progress = 1;


            fireNeuron(
                to
            );


            activeConnectionKeys.delete(
                connectionKey
            );


            activeSignals =
                activeSignals.filter(
                    item =>
                        item !== signal
                );


            return;

        }


        requestAnimationFrame(
            moveSignal
        );

    }


    requestAnimationFrame(
        moveSignal
    );

}


// ========================================
// UPDATE SIGNAL POSITION
// ========================================

function updateSignals() {

    activeSignals.forEach(
        signal => {

            const from =
                getNeuron(
                    signal.connection.fromRaw
                );

            const to =
                getNeuron(
                    signal.connection.toRaw
                );


            if (!from || !to) {
                return;
            }


            signal.x =
                from.x +
                (
                    to.x -
                    from.x
                )
                *
                signal.progress;


            signal.y =
                from.y +
                (
                    to.y -
                    from.y
                )
                *
                signal.progress;

        }
    );

}


// ========================================
// START SIMULATION
// ========================================

function startSimulation() {

    if (!brainData) {

        responseText.textContent =
            "FlyWire data loading...";

        return;

    }


    if (!selectedStimulus) {

        responseText.textContent =
            "Select a stimulus first";

        return;

    }


    const config =
        stimulusConfig[
            selectedStimulus
        ];


    running = true;

    simulationTime = 0;

    neuronsFired = 0;

    connectionsUsed = 0;

    activeSignals = [];

    firedNeuronIds.clear();

    activeConnectionKeys.clear();


    simulationRun++;


    const currentRun =
        simulationRun;


    // ------------------------------------
    // RESET NEURON ACTIVITY
    // ------------------------------------

    neurons.forEach(
        neuron => {

            neuron.active = false;

        }
    );


    neuronsFiredText.textContent =
        "0";


    connectionsUsedText.textContent =
        "0";


    simulationTimeText.textContent =
        "0.00 s";


    // ------------------------------------
    // FIND REAL STARTING NEURON
    // ------------------------------------

    const startingNeuron =
        neurons.find(
            neuron =>
                neuron.name ===
                config.startNeuron
        );


    if (!startingNeuron) {

        responseText.textContent =
            `${config.startNeuron} not found`;

        return;

    }


    const outgoing =
        findOutgoingConnections(
            startingNeuron
        );


    console.log(
        "================================="
    );

    console.log(
        "STARTING FLYWIRE SIMULATION"
    );

    console.log(
        "Stimulus:",
        selectedStimulus
    );

    console.log(
        "Neuron:",
        startingNeuron.name
    );

    console.log(
        "Real outgoing connections:",
        outgoing.length
    );

    console.log(
        "================================="
    );


    responseText.textContent =
        "⚡ Neural signal propagating...";


    // ------------------------------------
    // START REAL PROPAGATION
    // ------------------------------------

    fireNeuron(
        startingNeuron
    );


    // ------------------------------------
    // SIMULATED RESPONSE
    // ------------------------------------

    setTimeout(
        () => {

            if (
                currentRun ===
                simulationRun
            ) {

                responseText.textContent =
                    config.response;

            }

        },

        5000
    );

}


// ========================================
// PAUSE
// ========================================

function pauseSimulation() {

    running = false;

}


// ========================================
// RESET
// ========================================

function resetSimulation() {

    running = false;

    simulationRun++;

    simulationTime = 0;

    neuronsFired = 0;

    connectionsUsed = 0;

    activeSignals = [];

    firedNeuronIds.clear();

    activeConnectionKeys.clear();


    neurons.forEach(
        neuron => {

            neuron.active = false;

        }
    );


    neuronsFiredText.textContent =
        "0";


    connectionsUsedText.textContent =
        "0";


    simulationTimeText.textContent =
        "0.00 s";


    responseText.textContent =
        "Waiting...";

}


// ========================================
// STIMULUS BUTTONS
// ========================================

document
    .querySelectorAll(
        ".stimulus-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    selectedStimulus =
                        button.dataset.stimulus;


                    // --------------------------------
                    // ACTIVE BUTTON
                    // --------------------------------

                    document
                        .querySelectorAll(
                            ".stimulus-btn"
                        )
                        .forEach(
                            btn => {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    // --------------------------------
                    // LOAD CORRESPONDING DATA
                    // --------------------------------

                    await loadStimulusData(
                        selectedStimulus
                    );

                }
            );

        }
    );


// ========================================
// CONTROL BUTTONS
// ========================================

startBtn.addEventListener(
    "click",
    startSimulation
);


pauseBtn.addEventListener(
    "click",
    pauseSimulation
);


resetBtn.addEventListener(
    "click",
    resetSimulation
);


// ========================================
// RESIZE CANVAS
// ========================================

function resizeCanvas() {

    canvas.width =
        canvas.clientWidth;

    canvas.height =
        canvas.clientHeight;


    if (brainData) {

        positionNetwork();

    }

}


window.addEventListener(
    "resize",
    resizeCanvas
);


// ========================================
// ANIMATION LOOP
// ========================================

function animate() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    drawConnections();

    updateSignals();

    drawSignals();

    drawNeurons();


    if (running) {

        simulationTime +=
            0.016 *
            Number(
                speedSlider.value
            );


        simulationTimeText.textContent =
            simulationTime.toFixed(2)
            +
            " s";

    }


    requestAnimationFrame(
        animate
    );

}


// ========================================
// INITIALIZE
// ========================================

resizeCanvas();

animate();


// Load Sugar dataset initially

selectedStimulus = "sugar";

loadBrain();