const $buttonPlotText = document.getElementById("buttonPlotText");
const $buttonPenUp = document.getElementById("buttonPenUp");
const $buttonPenDown = document.getElementById("buttonPenDown");
const $penUpHeight = document.getElementById("penUpHeight");
const $penDownHeight = document.getElementById("penDownHeight");
const $textToPlot = document.querySelector(".textToPlot");

const FONT_URL = 'https://use.typekit.net/af/1bc5c3/00000000000000007735f378/31/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n4&v=3';

const handlePenAction = async (action) => {
    const penUp = $penUpHeight.value;
    const penDown = $penDownHeight.value;
    try {
        const response = await fetch('http://localhost:3000/api/pen-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, penUp, penDown })
        });
        if (!response.ok) {
            console.error(`Pen ${action} failed`);
        }
    } catch (e) {
        console.error(`Pen ${action} fetch error:`, e);
    }
};

const setPenUp = () => handlePenAction('up');
const setPenDown = () => handlePenAction('down');

const plotText = async () => {
    const text = $textToPlot.textContent.trim();
    console.log("Plotting text:", text);
    const penUp = $penUpHeight.value;
    const penDown = $penDownHeight.value;

    try {
        // 1. Load the font
        const font = await opentype.load(FONT_URL);
        
        // 2. Generate the path
        // To match what you see on screen exactly:
        // We read the actual size of the div and the text in pixels.
        const rect = $textToPlot.getBoundingClientRect();
        const divWidth = rect.width;
        const divHeight = rect.height;

        const pTag = $textToPlot.querySelector('p') || $textToPlot;
        const fontSizePx = parseFloat(window.getComputedStyle(pTag).fontSize);
        
        let path = font.getPath(text, 0, 0, fontSizePx);
        const bounds = path.getBoundingBox();
        const textWidth = bounds.x2 - bounds.x1;
        const textHeight = bounds.y2 - bounds.y1;
        
        // Center position in the div's coordinate space
        const xPos = (divWidth - textWidth) / 2 - bounds.x1;
        const yPos = (divHeight - textHeight) / 2 - bounds.y1;

        // Re-generate the path at the centered location
        path = font.getPath(text, xPos, yPos, fontSizePx);
        
        // 3. Create SVG string
        // We set precise A5 physical dimensions (210mm x 148.5mm) on the SVG wrapper.
        // We map the viewBox exactly to the div's pixel size, this means the full div width equals 210mm!
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="148.5mm" viewBox="0 0 ${divWidth} ${divHeight}">
            ${path.toSVG()}
        </svg>`;

        console.log("Generated SVG:", svgString);

        // 4. Send to backend
        const response = await fetch('http://localhost:3000/api/plot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ svg: svgString, penUp, penDown })
        });

        const result = await response.json();
        if (result.success) {
            console.log("Plot success:", result.message);
            alert("Sent to plotter! (Optimized SVG received)");
        } else {
            console.error("Plot error:", result.error);
            alert("Error plotting: " + result.error);
        }

    } catch (error) {
        console.error("Error in plotText:", error);
        alert("Failed to plot: " + error.message);
    }
}

const init = () => {
    $buttonPlotText.addEventListener("click", plotText);
    $buttonPenUp.addEventListener("click", setPenUp);
    $buttonPenDown.addEventListener("click", setPenDown);
}

init();

