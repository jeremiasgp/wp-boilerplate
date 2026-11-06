<?php
/**
 * Starter Theme asset registration.
 *
 * @package StarterTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Share the stylesheet between the frontend and block editor.
 *
 * @return void
 */
function starter_theme_enqueue_styles() {
	wp_enqueue_style(
		'starter-theme',
		get_theme_file_uri( 'style.css' ),
		array(),
		wp_get_theme()->get( 'Version' )
	);
}
add_action( 'enqueue_block_assets', 'starter_theme_enqueue_styles' );
