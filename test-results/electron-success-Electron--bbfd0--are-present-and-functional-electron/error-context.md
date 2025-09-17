# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "Video Converter" [level=1] [ref=e5]
    - paragraph [ref=e6]: Convert your videos to web-optimized MP4 format
    - paragraph [ref=e7]: Electron 27.3.11 • Node.js 18.17.1
  - main [ref=e8]:
    - generic [ref=e9]:
      - heading "Input Video File" [level=2] [ref=e10]
      - button "📁 Choose Video File" [ref=e12]
    - generic [ref=e13]:
      - heading "Output Location" [level=2] [ref=e14]
      - button "💾 Choose Save Location" [ref=e16]
    - generic [ref=e17]:
      - heading "Conversion Settings" [level=2] [ref=e18]
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: "Output Format:"
          - combobox "Output Format:" [ref=e22]:
            - option "MP4 (Recommended)" [selected]
            - option "AVI"
            - option "MOV"
            - option "MKV"
            - option "WebM"
        - generic [ref=e23]:
          - generic [ref=e24]: "Quality:"
          - combobox "Quality:" [ref=e25]:
            - option "High Quality" [selected]
            - option "Medium Quality"
            - option "Low Quality"
      - button "🎬 Start Conversion" [disabled] [ref=e26]
```