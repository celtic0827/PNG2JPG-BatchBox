# BatchBox

**Secure Local File Processing Suite**

BatchBox is a high-performance, browser-based toolset designed for professional workflows where privacy and speed are paramount. It operates entirely client-side, ensuring your files never leave your device while providing powerful batch manipulation capabilities.

## 🛠 Tools Suite

### 1. Image Converter
*   **Batch Processing:** Convert large quantities of PNG/JPG/WebP images to optimized JPG format.
*   **Transparency Handling:** Custom **Matte Color** backgrounds for transparent images (PNG/WebP).
*   **Optimization:** Granular control over **Quality** and **Scale**.

### 2. Square Cropper (New)
*   **Manual Precision:** Position and zoom images within a standardized square frame.
*   **Auto-Fitting:** Quick "Fit" and "Fill" controls for rapid alignment.
*   **Standardized Output:** Export multiple images at 512px, 1024px, or 2048px resolutions.

### 3. Batch Curves (New)
*   **Luminance Control:** Master RGB cubic spline curve adjustments to fix contrast issues.
*   **Color Correction:** Integrated **Temperature** (Blue/Amber) and **Tint** (Magenta/Green) tuning to neutralize AI-generated color casts.
*   **AB Comparison:** Real-time split-screen comparison against original or reference images.
*   **Persistence:** Your curve settings and color tunings are automatically saved to local storage.
*   **Memory Bank:** Save and load custom presets for recurring workflows.

### 4. Batch Zipper
*   **Structure Preservation:** Drag & drop multiple folders; BatchBox zips them individually.
*   **Local Compression:** Fast DEFLATE compression executed within the browser thread.

## ⚡️ Key Features

*   **Zero-Upload Privacy:** 100% local execution. No server, no cloud, no data leaks.
*   **High Performance:** Leverages the native Canvas API for hardware-accelerated image manipulation.
*   **Cyberpunk Interface:** Immersive terminal-style UI with real-time manifest tracking and status indicators.
*   **Zero Disk Caching:** Processes directly in memory for maximum security.

## 🚀 Usage

### Batch Curves Adjustment
1. Select the **Batch Curves** tab.
2. Drop your target images (PNG, JPG, WebP) into the left manifest or main zone.
3. Adjust the **Master Curve** by dragging points (double-click to delete).
4. Use the **Color Tuning** sliders below the preview to fix red-tints or warmth.
5. Toggle **AB Mode** to compare your changes against the original.
6. Click **Apply Batch** and **Export ZIP**.

### Square Cropper
1. Select the **Square Cropper** tab.
2. Add images to the layer list.
3. Use the mouse to drag images and the wheel to zoom.
4. Set your target resolution and export the entire batch as a ZIP.

## 💻 Tech Stack

*   **Core:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS (Custom Cyberpunk Theme)
*   **Processing:** Native Canvas API (Images), JSZip (Compression)
*   **Icons:** Lucide React
