# Quaternius weapon expansion

The browser version now includes 40 complete guns from Quaternius's CC0 Ultimate Gun Pack alongside the original six weapons. Standalone accessory models are excluded. Original OBJ/MTL files and the author's license are in `public/models/quaternius`.

Open `/armory.html` to see the labeled models, rotate individual guns, filter categories, or download the 2400 × 2300 contact sheet. A saved guide is also served at `/guides/Neon-Dead-40-Weapon-Guide.png`.

Each gun is obtainable through the existing 950-point mystery box. The normal starting loadout is unchanged. For focused feedback, a card's **Test in game** link starts a new session with that gun plus the original pistol; choose **Normal loadout** to return to standard survival.

The HUD and gallery share feedback numbers 01–40 and names from `src/game/weaponCatalog.ts`. Six sniper models include fixed 4×, 6×, or 8× scopes. Hold right mouse to magnify the actual scene with a circular sight and reticle. Scoping reduces mouse sensitivity and disengages during reload. Other guns use iron-sight aiming. New shotguns spread their listed total damage across eight pellets. Fire rates, ammunition, and reload timing vary by weapon family and variant; Speed Cola still halves reload time.

Imported models use a whole-weapon reload tilt; they do not have separate animated magazine meshes. Original weapons retain their existing magazine animations. Models are loaded before play, cached, and cloned with independent rendering resources to allow safe switching.

Validation: TypeScript and production builds; 21 tests including source-to-catalog coverage, all 40 geometry imports, scope magnification/reset, resource ownership, and existing map collision checks. Browser inspection verified all 40 gallery models and a sniper loadout in the rooftop scene. Full mouse-captured firing/ADS still requires external Chrome or Edge because the Codex embedded browser rejects pointer lock.

Source: https://quaternius.itch.io/50-lowpoly-guns
