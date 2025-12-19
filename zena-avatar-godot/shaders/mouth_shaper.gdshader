shader_type canvas_item;

uniform float feather_amount : hint_range(0.0, 1.0) = 0.2;
uniform float mask_softness : hint_range(0.0, 1.0) = 0.5;
uniform float radial_scale : hint_range(0.1, 2.0) = 1.0;
uniform vec2 offset = vec2(0.0, 0.0);

void fragment() {
	vec4 tex_color = texture(TEXTURE, UV);
	
	// Calculate radial mask
	vec2 uv_offset = (UV - 0.5) * 2.0; // Range -1 to 1
	uv_offset += offset;
	float dist = length(uv_offset) / radial_scale;
	
	// Feathering logic
	float mask = 1.0 - smoothstep(1.0 - feather_amount, 1.0, dist);
	
	// Apply mask to alpha
	COLOR = vec4(tex_color.rgb, tex_color.a * mask);
}
