# Overview

This is a Discord bot that generates military-style NOTAMs (Notice to Airmen) for operation briefings. The bot provides slash commands for administrators to create formatted operational notices with structured information including operation names, leaders, times, details, and positions. It uses an interactive form-based approach with modals and buttons for user input collection.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Architecture
The application follows a modular Discord.js v14 architecture with command handling, permission management, and template generation:

- **Command System**: Uses Discord.js slash commands with a collection-based command loader that dynamically imports command modules from the `/commands` directory
- **Event-Driven Design**: Handles Discord events (ClientReady, InteractionCreate) for bot lifecycle and user interactions
- **Modular Structure**: Separates concerns into dedicated modules for commands, utilities, templates, and configuration

## Permission System
Implements a multi-layered permission verification system:

- **Role-Based Access**: Checks for Administrator, ManageGuild permissions, and specific admin role names
- **Owner Override**: Guild owners automatically have access regardless of roles
- **Configurable Roles**: Supports custom admin role names through configuration
- **Security First**: All NOTAM creation commands require administrative privileges

## Form Management
Uses Discord's native UI components for data collection:

- **Modal Forms**: Multi-step form collection using Discord modals with text inputs
- **Interactive UI**: Buttons and action rows for form navigation and submission
- **Temporary Storage**: In-memory Map-based storage for form data (suitable for single-instance deployment)
- **Session Management**: Tracks user form sessions with configurable timeouts and limits

## Template Engine
Structured template system for NOTAM generation:

- **Field Configuration**: Centralized field definitions with validation rules, character limits, and required/optional status
- **Dynamic Generation**: Template functions that generate formatted military-style NOTAMs from user input
- **Extensible Design**: Template system allows for easy addition of new NOTAM formats or modifications

## Configuration Management
Environment-based configuration with performance optimizations:

- **Environment Variables**: Uses dotenv for sensitive data like bot tokens
- **Performance Tuning**: Optimized settings for resource-constrained environments (Raspberry Pi Zero)
- **Caching Strategy**: Configurable caching with cleanup intervals for memory management
- **Logging Controls**: Granular logging configuration for different component activities

# External Dependencies

## Core Dependencies
- **discord.js v14.21.0**: Primary Discord API library providing bot functionality, slash commands, embeds, modals, and interaction handling
- **dotenv v17.2.1**: Environment variable management for secure configuration loading

## Discord API Integration
- **Gateway Intents**: Configured for Guilds, GuildMessages, and MessageContent intents
- **Slash Commands**: Full integration with Discord's application command system
- **Interactive Components**: Utilizes Discord's modal, button, and embed systems for rich user interactions

## Node.js Runtime
- **File System Operations**: Uses Node.js fs module for dynamic command loading
- **Path Resolution**: Node.js path module for cross-platform file path handling
- **Built-in Collections**: Leverages Discord.js Collection class for efficient command storage and retrieval

The application is designed as a self-contained Discord bot with no external database requirements, using in-memory storage for temporary form data and file-based command loading.