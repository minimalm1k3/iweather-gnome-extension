// Adapted from Blur My Shell's corner.glsl:
// https://github.com/aunetx/blur-my-shell/blob/master/src/effects/corner.glsl
// Copyright (C) Aurelien Hamy and Blur My Shell contributors.
// Licensed under GPL-3.0-or-later and modified for iWeather in 2026.
// This masks the final framebuffer after the stock actor blur is painted.
uniform sampler2D tex;
uniform float radius;
uniform float width;
uniform float height;

float rounded_rect_distance(vec2 point, vec2 size, float corner_radius) {
    vec2 half_size = size * 0.5;
    vec2 delta = abs(point - half_size) - (half_size - vec2(corner_radius));
    return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0) - corner_radius;
}

void main(void) {
    vec2 uv = cogl_tex_coord_in[0].xy;
    vec2 size = vec2(max(1.0, width), max(1.0, height));
    vec2 inset_uv = clamp(uv, vec2(1.0) / size, vec2(1.0) - vec2(1.0) / size);
    vec4 color = texture2D(tex, inset_uv);
    float distance = rounded_rect_distance(uv * size, size, radius);
    float coverage = 1.0 - smoothstep(-0.75, 0.75, distance);
    cogl_color_out = vec4(color.rgb * coverage, color.a * coverage);
}
