// Global variables
let mazeNodes = {};
let nameCounter = 11;

// Check if globals are defined
if (typeof maxMaze === 'undefined') {
    maxMaze = 0;
}

if (typeof maxSolve === 'undefined') {
    maxSolve = 0;
}

if (typeof maxCanvas === 'undefined') {
    maxCanvas = 0;
}

if (typeof maxCanvasDimension === 'undefined') {
    maxCanvasDimension = 0;
}

if (typeof maxWallsRemove === 'undefined') {
    maxWallsRemove = 300;
}

// Update remove max walls html
const removeMaxWallsText = document.querySelector('.desc span');
if (removeMaxWallsText) {
    removeMaxWallsText.innerHTML = maxWallsRemove;
}

const removeWallsInput = document.getElementById('remove_walls');
if (removeWallsInput) {
    removeWallsInput.max = maxWallsRemove;
}

const download = document.getElementById("download");
download.addEventListener("click", downloadImage, false);
download.setAttribute('download', 'maze.png');

function initMaze() {
    download.setAttribute('download', 'maze.png');
    download.innerHTML = 'download maze';

    const settings = {
        width: getInputIntVal('width', 20),
        height: getInputIntVal('height', 20),
        wallSize: getInputIntVal('wall-size', 10),
        removeWalls: getInputIntVal('remove_walls', 0),
        entryType: '',
        bias: '',
        color: '#000000',
        backgroundColor: '#FFFFFF',
        solveColor: '#cc3737',

        // restrictions
        maxMaze: maxMaze,
        maxCanvas: maxCanvas,
        maxCanvasDimension: maxCanvasDimension,
        maxSolve: maxSolve,
        maxWallsRemove: maxWallsRemove,
    }

    const colors = ['color', 'backgroundColor', 'solveColor'];
    for (let i = 0; i < colors.length; i++) {
        const colorInput = document.getElementById(colors[i]);
        settings[colors[i]] = colorInput.value
        if (!isValidHex(settings[colors[i]])) {
            let defaultColor = colorInput.parentNode.dataset.default;
            colorInput.value = defaultColor;
            settings[colors[i]] = defaultColor;
        }

        const colorSample = colorInput.parentNode.querySelector('.color-sample');
        colorSample.style = 'background-color: ' + settings[colors[i]] + ';';
    }

    if (settings['removeWalls'] > maxWallsRemove) {
        settings['removeWalls'] = maxWallsRemove;
        if (removeWallsInput) {
            removeWallsInput.value = maxWallsRemove;
        }
    }

    const entry = document.getElementById('entry');
    if (entry) {
        settings['entryType'] = entry.options[entry.selectedIndex].value;
    }

    const bias = document.getElementById('bias');
    if (bias) {
        settings['bias'] = bias.options[bias.selectedIndex].value;
    }

    const maze = new Maze(settings);
    maze.generate();
    maze.draw();
    const jsonObject = JSON.parse(JSON.stringify({ levelGrid: maze.matrix, levelName: "defaultGameLevel" + nameCounter }));
    const levelGrid = jsonObject.levelGrid;
    const formattedLevelGrid = levelGrid.map(row => row.split('').map(char => char === '1' ? '#' : ' '));
    // Insert 'S' at the 2nd row, 1st column and 'E' at the 2nd-to-last row, last column
    formattedLevelGrid[1][0] = 'S'; // 2nd row, 1st column
    formattedLevelGrid[formattedLevelGrid.length - 2][formattedLevelGrid[0].length - 1] = 'E'; // 2nd last row, last column
    // Insert coins
    const updatedGrid = insertCoins(formattedLevelGrid);
    // Send the request using fetch
    fetch('http://coms-3090-023.class.las.iastate.edu:8080/createLevel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // Correct content type
        },
        body: JSON.stringify({ levelGrid: updatedGrid, levelName: "defaultGameLevel" + nameCounter })
      })
      .then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error(error));
   
      nameCounter++;

    // you can automate putting S and E easily if they are always top left and bottom right
    if (download && download.classList.contains('hide')) {
        download.classList.toggle("hide");
    }

    const solveButton = document.getElementById("solve");
    if (solveButton && solveButton.classList.contains('hide')) {
        solveButton.classList.toggle("hide");
    }

    mazeNodes = {}
    if (maze.matrix.length) {
        mazeNodes = maze;
    }

    location.href = "#";
    location.href = "#generate";
}

function insertCoins(formattedLevelGrid) {
    const rows = formattedLevelGrid.length;
    const cols = formattedLevelGrid[0].length;

    // Find the starting position ('S')
    let startRow = -1, startCol = -1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (formattedLevelGrid[r][c] === 'S') {
                startRow = r;
                startCol = c;
                break;
            }
        }
        if (startRow !== -1) break;
    }

    // Directions: up, right, down, left
    const directions = [
        [-1, 0], [0, 1], [1, 0], [0, -1]
    ];

    // Helper to check if a cell is valid and not visited
    function isValid(row, col, visited) {
        return (
            row >= 0 &&
            col >= 0 &&
            row < rows &&
            col < cols &&
            formattedLevelGrid[row][col] === ' ' &&
            !visited.has(`${row},${col}`)
        );
    }

    const visited = new Set();
    visited.add(`${startRow},${startCol}`);

    let coinsPlaced = 0;
    let currentRow = startRow;
    let currentCol = startCol;

    while (coinsPlaced < 30) {
        let moved = false;

        // Try moving to an adjacent cell
        for (const [dr, dc] of directions) {
            const newRow = currentRow + dr;
            const newCol = currentCol + dc;

            if (isValid(newRow, newCol, visited)) {
                visited.add(`${newRow},${newCol}`);
                currentRow = newRow;
                currentCol = newCol;
                moved = true;
                break; // Exit loop after moving
            }
        }

        // If no valid moves, it's a dead end - place a coin
        if (!moved) {
            formattedLevelGrid[currentRow][currentCol] = 'C';
            coinsPlaced++;

            // Restart search for unvisited empty space
            let foundNextStart = false;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (formattedLevelGrid[r][c] === ' ' && !visited.has(`${r},${c}`)) {
                        currentRow = r;
                        currentCol = c;
                        visited.add(`${r},${c}`);
                        foundNextStart = true;
                        break;
                    }
                }
                if (foundNextStart) break;
            }

            // If no unvisited spaces remain, stop
            if (!foundNextStart) break;
        }
    }

    return formattedLevelGrid;
}

function downloadImage(e) {
    const image = document.getElementById('maze').toDataURL("image/png");
    image.replace("image/png", "image/octet-stream");
    download.setAttribute("href", image);
}

function initSolve() {
    const solveButton = document.getElementById("solve");
    if (solveButton) {
        solveButton.classList.toggle("hide");
    }

    download.setAttribute('download', 'maze-solved.png');
    download.innerHTML = 'download solved maze';

    if ((typeof mazeNodes.matrix === 'undefined') || !mazeNodes.matrix.length) {
        return;
    }

    const solver = new Solver(mazeNodes);
    solver.solve();
    if (mazeNodes.wallsRemoved) {
        solver.drawAstarSolve();
    } else {
        solver.draw();
    }

    mazeNodes = {}
}