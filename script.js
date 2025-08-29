async function drawAlignmentMap() {
    let width = 1025
    let height = 1025
    let size = 1024

    let svg = d3.select("#overview").append("svg")
        .attr("id", "classOverviewSvg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "hidden")
        .append("g").attr("id", "classOverviewGr")

    console.log("svg")

    console.log(svg)

    let contourGroup = svg.append("g")

    let viewX = 0, viewY = 0;
    // let viewSize = 512;
    let viewSize = 1000;
    let currentZoomLevel = 1;
    let label = 1;
    // let currentGridSize = 64;
    let currentGridSize = 100;
    
    // const contourFiles = {
    //     1: "/contour_values_hps64.csv",
    //     2: "/contour_values_hps256.csv",
    //     3: "/contour_values_hps1024.csv",
    //     4: "/contour_values_hps1024k2.csv",
    //     5: "/contour_values_hps1024k4.csv",
    //     6: "/contour_values_hps1024k6.csv",
    //     7: "/contour_values_hps1024k8.csv",

    // };

    const contourFiles = {
        1: "data/HPD_HPSv2_100_zi_output.csv",
        2: "data/HPD_HPSv2_250_zi_output.csv",
        3: "data/HPD_HPSv2_500_zi_output.csv",
        4: "data/HPD_HPSv2_1000_zi_output.csv",
    }


    let quadtree = {};

    // 加载所有等高线数据
    async function loadAllContours() {
        for (let key in contourFiles) {
            let label = parseInt(key);
            let text = await d3.text(contourFiles[key]);  
            let data = d3.csvParseRows(text, row => row.map(Number));  
            quadtree[label] = data;
        }
        console.log("四叉树初始化完成", quadtree);
    }

    let data1 = await d3.csv("data/hps_diffusiondb_merged.csv");

    await loadAllContours(); 

    console.log("here")

    let sampleSize = 1000

    let indices = data1.map((_, i) => i);

    // Shuffle the indices using Fisher-Yates Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // Pick a random index up to i
        [indices[i], indices[j]] = [indices[j], indices[i]]; // Swap elements
    }

    // Select the first `sampleSize` indices
    let sampledIndices = indices.slice(0, sampleSize);

    // Slice the array based on the sampled indices
    let data2 = sampledIndices.map(i => data1[i]);
    // let extent1 = d3.extent(data1.map(d => d.score)); 
    // console.log("ex",extent1)
    // console.log(data2)

    let initPoints = data2;

    data1.forEach((d, i) => {
        d.scaleLevel = i % 500+1; 
    });

    const container = document.getElementById("overview");

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    canvas.style.position = "absolute"; 
    canvas.style.left = "156px";  
    canvas.style.top = "0px"; 
    canvas.style.pointerEvents = "none";  
    const context = canvas.getContext("2d");
    let defaultTransform = { x: 0, y: 0, k: 1 };
    let currentTransform= { x: 0, y: 0, k: 1 };
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // canvas.width = 4100;
    // canvas.height = 4100;
    // canvas.style.width = "1025px";
    // canvas.style.height = "1025px";

    // context.scale(4, 4);


    function drawContours(label,gridSize, domainx, domainy) {
        console.log("label",label)
        let score_array = quadtree[label]
        // let x = d3.scaleLinear([0, 1], [0, 512])
        // let y = d3.scaleLinear([0, 1], [0, 512])
        let x = d3.scaleLinear([0, 1], [0, 1000])
        let y = d3.scaleLinear([0, 1], [0, 1000])
        let q = Math.max(1, Math.floor(1024 / gridSize)); // The level of detail, e.g., sample every 4 pixels in x and y.
        // let x0 = -q / 2, x1 = 500 + q;
        // let y0 = -q / 2, y1 = 500 + q;
        // let x0 = q / 2, x1 = 512 + q;
        // let y0 = q / 2, y1 = 512 + q;
        let x0 = q / 2, x1 = 1000 + q;
        let y0 = q / 2, y1 = 1000 + q;
        let n = gridSize;
        let m = gridSize;
        let grid = new Array(n * m);
        // console.log(n)
        // console.log(m)
        for (let j = 0; j < m; ++j) {
            for (let i = 0; i < n; ++i) {
                grid[(n - i - 1) * m + j] = score_array[i][j];
            }
        }
        grid.x = -q;
        grid.y = -q;
        grid.k = q;
        grid.n = n;
        grid.m = m;

        let min_end = 25
        let extent = d3.extent(score_array.flat()); // Find min and max

        console.log(extent)

        let thresholds = d3.range(extent[0], extent[1], (extent[1] - extent[0]) / 40);
        let color = d3.scaleSequential(d3.interpolateRdYlBu).domain([extent[1], extent[0]]);


        let transform = ({ type, value, coordinates }) => {
            return {
                type, value, coordinates: coordinates.map(rings => {
                    return rings.map(points => {
                        return points.map(([x, y]) => ([
                            grid.k * x,
                            grid.k * y
                        ]));
                    });
                })
            };
        }

        let contours = d3.contours()
            .size([grid.n, grid.m])
            .thresholds(thresholds)
            (grid)
            .map(transform)

        console.log(contours)

        contourGroup.selectAll("path").remove();

        contourGroup.append("g")
            .attr("fill", "none")
            // .attr("stroke", "#fff")
            .attr("stroke-opacity", 0.5)
            .selectAll("path")
            .data(contours)
            .join("path")
            .attr("fill", (d) => {
                const res = color(d.value)
                return res
            }
            )
            .attr("fill-opacity", 0.3)
            .attr("d", d3.geoPath())
            // .attr("stroke", "black")
            .style("mix-blend-mode", "normal") //为了不重叠
            .transition()
            .duration(100) 
            .ease(d3.easeLinear) 

            
    }

    // const hoverRadius = 8; 
    const fibonacciLevels = [0, 1, 2, 3, 5, 8, 13, 21, 21, 34, 34, 55, 55,55,55,64];



    let zoom = d3.zoom()
        .scaleExtent([1, 16])  
        .on("zoom", (event) =>{
            let zoomLevel = event.transform.k;
            console.log("当前缩放级别:", zoomLevel);
            currentTransform = event.transform;
            currentZoomLevel = zoomLevel;
            // console.log("!!",currentZoomLevel)
            let scaleThreshold = fibonacciLevels[Math.min(Math.floor(zoomLevel)-1,fibonacciLevels.length-1)];
            console.log(scaleThreshold)
            // if(scaleThreshold==0){
            //     data2 = initPoints;
            // }else{
            //     data2 = data1.filter(d => d.scaleLevel <= scaleThreshold);
            // }

            // console.log(data2.length)


            let newGridSize;
            if (zoomLevel < 1.5) {
                label = 1;
                newGridSize = 100;
            } else if (zoomLevel < 2.5) {
                newGridSize = 250;
                label = 2;
            } else if (zoomLevel < 3.5) {
                newGridSize = 500;
                label = 3;
            } 
            else if (zoomLevel < 4.5) {
                newGridSize = 1000;
                label = 4;
            }
            // else if (zoomLevel < 7) {
            //     newGridSize = 1024;
            //     label = 5;
            // }else if (zoomLevel <= 13) {
            //     newGridSize = 1024;
            //     label = 6;
            // }
            // else if (zoomLevel <= 25) {
            //     newGridSize = 1024;
            //     label = 7;
            // }


            if (currentGridSize !== newGridSize) {

                // let newSize = 512 / zoomLevel;
                let newSize = 1000 / zoomLevel;
                let newX = -event.transform.x * (newSize / size);
                let newY = -event.transform.y * (newSize / size);

                viewX = newX;
                viewY = newY;
                viewSize = newSize;
                currentGridSize = newGridSize;
                currentZoomLevel = zoomLevel;

                requestAnimationFrame(() => {
                    drawContours(label,currentGridSize, [viewX, viewX + viewSize], [viewY, viewY + viewSize]);


                });
            }
            // if (currentGridSize == 1024) {

            //     let newSize = 512 / zoomLevel;
            //     let newX = -event.transform.x * (newSize / size);
            //     let newY = -event.transform.y * (newSize / size);

            //     viewX = newX;
            //     viewY = newY;
            //     viewSize = newSize;
            //     currentGridSize = newGridSize;
            //     currentZoomLevel = zoomLevel;

            //     requestAnimationFrame(() => {
            //         drawContours(label,currentGridSize, [viewX, viewX + viewSize], [viewY, viewY + viewSize]);

            //     });
            // }

            contourGroup.attr("transform", event.transform);
            // this.drawPoints(data2,context,event.transform)

        });

    svg.call(zoom);
    drawContours(label,currentGridSize, [0, 1], [0, 1]);
    drawPoints(data2,context,defaultTransform);

}

function drawPoints(data2,context,transform){
    context.clearRect(0, 0, 1025, 1025);
        // console.log("clean",currentGridSize)
    // let grid = Math.max(1, Math.floor(1024 / 32));
    let grid = Math.max(1, Math.floor(1024 / 16));
        // console.log(grid)
        // console.log("width",canvas.width)
        // console.log(transform.x,transform.y)
    let zoomCenterX = (1025 / 2 - transform.x) / transform.k;
    let zoomCenterY = (1025 / 2 - transform.y) / transform.k;
    let extent = d3.extent(data2.map(d => d.score)); 
        // console.log(extent)
        // console.log(extent[0])
    // console.log(extent[1])
    let color = d3.scaleSequential(d3.interpolateRdYlBu).domain([0.3278125, 0.19]);
    // console.log("data2",data2)
    data2.forEach((d, i) => {
        // coco
        // let x = (grid+5)*(parseFloat(d["x"]))+530;
        // let y = (grid+31)*(-parseFloat(d["y"]))+480;
        let x = (grid+10)*(parseFloat(d["x"]))+402;
        let y = (grid+5.78)*(-parseFloat(d["y"]))+490;
        // let x = (grid-2)*(parseFloat(d["x"]))+560;
        // let y = (grid-3.5)*(-parseFloat(d["y"]))+435;

        // 计算相对画布中心的偏移
        let dx = x - zoomCenterX;
        let dy = y - zoomCenterY;

        x = 1025 / 2 + dx * transform.k;
        y = 1025 / 2 + dy * transform.k;

        let radius = 3
        // if(this.highlightedPoint && d["im_path"] === this.highlightedPoint.im_path)
        //     radius = 8

        context.fillStyle = color(d["score"]);
        context.strokeStyle = "rgba(128, 128, 128, 0.5)";
        context.lineWidth = 0.6; // 边框宽度

                // 绘制圆形（点）
        context.beginPath();
        // context.fillRect(x - radius, y - radius, 2*radius, 2*radius);

        context.arc(x, y, radius, 0, 2 * Math.PI); // 绘制圆
        context.fill(); // 填充颜色
        context.stroke(); // 绘制边框
    });
    // console.log("1",this.drawnRectangles)
    // if(this.drawnRectangles.length){
    //     context.strokeStyle = "black";
    //     context.strokeRect(this.drawnRectangles[0].x, this.drawnRectangles[0].y, this.drawnRectangles[0].width, this.drawnRectangles[0].height);
    // }

}

// function setPoint(){
//     this.showPoint = !this.showPoint;
//     const canvas = document.querySelector("canvas"); // 获取 canvas
//     if (canvas) {
//         canvas.style.display = this.showPoint ? "block" : "none"; 
//     }
// }

drawAlignmentMap();