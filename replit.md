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
- **discord.js v14.22.1**: Primary Discord API library providing bot functionality, slash commands, embeds, modals, and interaction handling
- **dotenv v17.2.1**: Environment variable management for secure configuration loading
- **better-sqlite3**: High-performance SQLite database for persistent training data storage

## Discord API Integration
- **Gateway Intents**: Configured for Guilds, GuildMessages, MessageContent, and GuildMembers intents
- **Slash Commands**: Full integration with Discord's application command system including subcommand groups
- **Interactive Components**: Utilizes Discord's modal, button, embed, and select menu systems for rich user interactions

## Training System Integration
- **SQLite Database**: Persistent storage for certifications, training sessions, exam results, and analytics
- **Comprehensive Command System**: Multi-level command hierarchy with training, exam, and scheduling subsystems
- **Question Bank System**: Extensive exam questions for all certification types
- **Session Management**: Advanced scheduling and participant tracking

## Node.js Runtime
- **File System Operations**: Uses Node.js fs module for dynamic command loading
- **Path Resolution**: Node.js path module for cross-platform file path handling
- **Built-in Collections**: Leverages Discord.js Collection class for efficient command storage and retrieval
- **Database Operations**: Synchronous SQLite operations for reliable data persistence

The application now features a complete training certification system with database persistence, comprehensive exam system, and advanced scheduling capabilities alongside the original NOTAM and operation management features.

# Training System Features

## Certification Management
- **Aircraft Certifications**: F-22, F-16, F-35, A-10, KC-135, C-130
- **Role Certifications**: Flight Lead, Mission Commander, ATC, Ground Crew
- **Skill Certifications**: Formation Flying
- **Instructor Levels**: Basic Instructor, Senior Instructor
- **Prerequisites System**: Automatic validation of certification requirements

## Written Examination System
- **10+ Questions per Certification**: Comprehensive question banks
- **Multiple Choice Format**: Easy-to-answer format with immediate feedback
- **70% Passing Score**: Industry-standard requirements
- **Retake Capability**: Unlimited attempts for failed exams
- **Score Tracking**: Historical exam performance

## Training Session Management
- **Session Types**: Ground School, Simulator, Flight Training, Weapons Training, Emergency Procedures
- **Capacity Management**: Automatic enrollment limits and waitlists
- **Instructor Assignment**: Qualified instructor matching
- **Schedule Tracking**: Upcoming session visibility

## Progress Tracking
- **Training Hours**: Detailed logging by session type
- **Trainer Notes**: Instructor feedback and progress notes
- **Analytics Dashboard**: Performance metrics and trends
- **Leaderboards**: Top performer recognition
- **Unit Readiness**: Overall squadron certification status

## Database Schema
- **12 Database Tables**: Complete relational structure
- **Data Persistence**: No data loss on bot restart
- **Performance Optimized**: Efficient queries and indexing
- **Security Focused**: Validated inputs and safe operations