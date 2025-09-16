-- Security Headers Analyzer Database Schema
-- Initialize database for development environment

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS security_headers_analyzer;

-- Connect to the database
\c security_headers_analyzer;

-- Create tables for storing analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    analysis_data JSONB NOT NULL,
    score INTEGER NOT NULL,
    grade VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id VARCHAR(255),
    cached BOOLEAN DEFAULT FALSE
);

-- Create table for storing GitHub PR history
CREATE TABLE IF NOT EXISTS github_prs (
    id SERIAL PRIMARY KEY,
    repo_url VARCHAR(512) NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url VARCHAR(512) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    title VARCHAR(512) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    fixes_applied JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for rate limiting (if not using Redis)
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL UNIQUE,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analysis_results_url ON analysis_results(url);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_results_client_id ON analysis_results(client_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_repo_url ON github_prs(repo_url);
CREATE INDEX IF NOT EXISTS idx_github_prs_created_at ON github_prs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_client_id ON rate_limits(client_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_analysis_results_updated_at
    BEFORE UPDATE ON analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_prs_updated_at
    BEFORE UPDATE ON github_prs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development
INSERT INTO analysis_results (url, analysis_data, score, grade, client_id) VALUES
('https://example.com', '{"headers": {"x-frame-options": "DENY"}, "analysis": {"summary": "Good"}}', 85, 'B', 'dev-client'),
('https://github.com', '{"headers": {"content-security-policy": "default-src ''self''"}, "analysis": {"summary": "Excellent"}}', 95, 'A', 'dev-client')
ON CONFLICT DO NOTHING;