const $buttonPlotText = document.getElementById("buttonPlotText");
const $textToPlot = document.querySelector(".textToPlot");

const FONT_URL = 'https://use.typekit.net/af/1bc5c3/00000000000000007735f378/31/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n4&v=3';

const plotText = async () => {
    const text = $textToPlot.textContent.trim();
    console.log("Plotting text:", text);

    try {
        // 1. Load the font
        const font = await opentype.load(FONT_URL);
        
        // 2. Generate the path
        // We use a font size that fits well in the div
        const fontSize = 72; 
        const path = font.getPath(text, 0, 0, fontSize);
        const bounds = path.getBoundingBox();
        
        // 3. Create SVG string
        // We wrap it in a proper SVG tag with viewbox
        const width = bounds.x2 - bounds.x1 + 40;
        const height = bounds.y2 - bounds.y1 + 40;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x1 - 20} ${bounds.y1 - 20} ${width} ${height}">
            ${path.toSVG()}
        </svg>`;

        console.log("Generated SVG:", svgString);

        // 4. Send to backend
        const response = await fetch('http://localhost:3000/api/plot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ svg: svgString })
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
}

init();

