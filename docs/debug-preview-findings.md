# Debug Preview Findings

The live Expo preview rendered the local onboarding identity form correctly. A temporary `Preview Responder` identity could be created in the browser, and the Home dashboard then rendered its offline coordination state, empty metrics, SOS control, and four-tab navigation.

The Settings route opened successfully and displayed the local identity, role chips, nearby permission state, connectivity toggles, accent controls, audit-log entry, reset-local-keys action, FAQ & Help entry, and About entry. The preview showed the expected browser-safe `Linux · Browser` device status and did not claim a live peer connection.

The preview can be used for UI and navigation smoke checks; BLE, camera, microphone, and Android runtime permissions remain native-device-only validations.

The Settings screen rendered correctly in the live browser preview after creating a temporary identity. The semantic FAQ click did not change the route in this browser automation session, so the FAQ navigation needs a targeted follow-up using the underlying control or a UI-level test; the route and component compile successfully in static checks.

After the root route fix hot-reloaded, the live Settings preview still did not navigate when clicking FAQ & Help through the semantic browser control. The source route handling is now correct for detail routes, so this indicates the custom Button wrapper or the browser automation target may be swallowing the click. A direct DOM click also did not change the route. The next fix should make the help entry a native Pressable row or otherwise ensure the FAQ action is directly interactive, then rerun preview navigation.

The dedicated FAQ Pressable row is visible after hot reload, but browser semantic activation still leaves the Settings screen unchanged. Static TypeScript/lint checks pass, so this is now isolated to the web preview interaction path or the Settings scroll overlay. The help entry remains documented and will be validated again after inspecting the rendered DOM and route state.

DOM inspection showed the FAQ row at y=830 in the nested Settings scroll container, below the viewport when the earlier click was attempted. The preview uses a nested scroll rather than global page scroll; after scrolling, the lower Settings content is visible. This explains the earlier semantic click miss and is not evidence that the route handler is broken.

After scrolling to the nested panel end, the FAQ row was visibly present with a full-width outlined hit target. Browser activation still returned to the same Settings view, so the remaining issue is reproducible in this preview path despite the route handler compiling. This is now tracked as a preview interaction discrepancy for final report; native device validation remains separate.

The browser reported an actual 1280×1100 viewport while the annotated screenshot was scaled to 896×768; the FAQ row’s DOM rect was y=830 in the real viewport. Coordinate-based clicks using the screenshot dimensions therefore missed the control. Static checks and source-level route handling are clean; final validation should use the actual viewport geometry or a physical-device interaction test.
