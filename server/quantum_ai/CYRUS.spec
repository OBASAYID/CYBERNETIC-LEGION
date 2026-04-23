# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/cyrus_desktop_app.py'],
    pathex=[],
    binaries=[],
    datas=[('/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/server', 'server')],
    hiddenimports=['quantum_ai.quantum_ai_core', 'quantum_ai.device_controller', 'tkinter', 'threading', 'logging', 'json', 'time', 'argparse'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='CYRUS',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
app = BUNDLE(
    exe,
    name='CYRUS.app',
    icon=None,
    bundle_identifier=None,
)
