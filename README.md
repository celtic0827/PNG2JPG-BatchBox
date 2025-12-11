# BatchBox

**Secure Local File Processing Suite**

BatchBox is a high-performance, browser-based tool designed for privacy-conscious users. It operates entirely client-side, ensuring your files never leave your device. It currently offers two main utilities:

1.  **Image Converter:** Batch convert PNG and JPG images to standardized JPG format and bundle them.
2.  **Batch Zipper:** Efficiently compress multiple folders into individual ZIP archives simultaneously.

## Features

*   **Zero-Upload Privacy:** All processing happens locally in your browser using native APIs.
*   **Dual Functionality:**
    *   **Image Converter:**
        *   Convert PNG/JPG to JPG.
        *   Handle transparency with custom **Matte Color**.
        *   Adjust **Quality** and **Scale**.
        *   One-click ZIP export of all converted images.
    *   **Batch Zipper:**
        *   Drag & drop multiple folders at once.
        *   Automatically creates separate ZIP files for each top-level folder.
        *   Preserves nested directory structures.
*   **Cyberpunk UI:** Immersive dark mode interface with neon accents and real-time status updates.

## Tech Stack

*   **Core:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS (Custom Cyberpunk Theme)
*   **Processing:** Native Canvas API (Images), JSZip (Compression)
*   **Icons:** Lucide React

## Usage

### Image Converter
1.  Select the **Image Converter** tab.
2.  Drag images into the drop zone.
3.  Configure **Quality**, **Scale**, and **Matte Color** in the Control Panel.
4.  Click **Execute Batch** to process.
5.  Click **Export ZIP Archive** to download results.

### Batch Zipper
1.  Select the **Batch Zipper** tab.
2.  Drag multiple folders into the drop zone.
3.  Click **Zip All Folders** to start compression.
4.  Download generated ZIPs individually or use **Download All**.