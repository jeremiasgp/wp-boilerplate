<?php
/**
 * Plugin Name: Starter Plugin
 * Description: Minimal home for functionality independent of the active theme.
 * Version: 1.0.0
 * Requires at least: 7.1
 * Requires PHP: 8.3
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: starter-plugin
 *
 * @package StarterPlugin
 */

namespace Starter_Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VERSION = '1.0.0';

// Register project-independent functionality on WordPress hooks as it is needed.
