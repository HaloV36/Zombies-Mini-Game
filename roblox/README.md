# Neon Zombies — Roblox Studio starter

This is a native Roblox recreation of the browser game. It uses Parts and built-in text, with no asset uploads, external packages, HTTP requests, or paid plugins required.

## Install

1. In Roblox Studio, create a **new Baseplate** place. Stay in **Edit** mode (stop any play test).
2. Open the **Command Bar** from Studio's View/Window menus.
3. Open `Install-NeonZombies.lua`, select all, and copy the entire file. Paste it into the **Command Bar**, then press Enter. This is the Studio Command Bar, not the in-game developer console or a Script editor.
4. Wait for the Output message `NEON ZOMBIES installed`.
5. Save the place and press **Play** (F5). Use **Play**, not Run, to spawn your character.

To copy the installer using PowerShell:

```powershell
Get-Content -Raw 'C:\Users\alexa\Zombies-Mini-Game\roblox\Install-NeonZombies.lua' | Set-Clipboard
```

The installer replaces only this kit's named map, scripts, and replicated folder. It also configures global lighting and first-person camera defaults. Use a new place to avoid conflicts with existing gameplay scripts and spawn locations. Running it again resets the kit to the source version.

## Included

- Two connected rooftop courts, open alley, neon storefronts, kitchen display, fences, skyline, grounded buildings, road markings, parked cars, neighboring roof with crates and ventilation equipment.
- Detailed block zombies, pathfinding, escalating rounds, server-controlled damage, points, ammunition, reloads and purchases.
- First-person weapon models: M1911, M1 Carbine, pump shotgun, Thompson, Ray Gun and Thundergun. The two special weapons currently use direct-hit damage, not splash or knockback.
- Juggernog (2,500 points; 250 health) and Speed Cola (3,000 points; half reload time), detailed red/green and cream cabinets.
- Wall purchases, 950-point mystery box, two weapon slots, HUD, hit feedback and tracers. Native first-person mouse capture.
- Shared multiplayer rounds. Players respawn; a simultaneous squad wipe restarts round progression. Perks reset on respawn. Reserve ammo replenishes between rounds.

## Controls

WASD move; mouse aim; left click fire; right click aim down sights; R reload; Q/1/2 toggle weapon; E interact; Space jump; Escape opens Roblox's menu. Basic touch fire/reload/swap buttons are included; desktop is the primary test target.

## Before publishing

Test in Studio using Play and a two-player local server. Check purchases, death/respawn, zombie movement through the alley, and reinstallation. This kit has not been gameplay-tested inside Studio by Codex. It does not yet include audio, saved progression, repairable barricades, power-up drops, or a downed-player revive system. No extra assets are required to play; you can add your own permitted sound assets later.

Publish from Studio to your Roblox account after testing. Configure the experience's access and content information in Roblox's publishing interface. Consider original perk/weapon branding and artwork for your public release.

## Edit source

`Config.luau` contains weapon balance. `Map.luau` builds the scenery. `Models.luau` builds weapons/zombies. `Server.server.luau` owns gameplay. `Client.client.luau` owns input/HUD/viewmodels.

After source changes, run `node roblox/build.mjs` from the repository root, then paste the rebuilt installer into Studio again. Studio-only edits are not exported back into these source files.
