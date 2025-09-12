import { supabase } from "./supabase.tsx";

// データベーステーブルの初期化
export async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // 1. Companies テーブル
    const { error: companiesError } = await supabase.rpc('create_companies_table');
    if (companiesError) {
      console.log('Companies table might already exist or error:', companiesError.message);
    }

    // 2. Users テーブル  
    const { error: usersError } = await supabase.rpc('create_users_table');
    if (usersError) {
      console.log('Users table might already exist or error:', usersError.message);
    }

    // 3. Projects テーブル
    const { error: projectsError } = await supabase.rpc('create_projects_table');
    if (projectsError) {
      console.log('Projects table might already exist or error:', projectsError.message);
    }

    // 4. Talents テーブル
    const { error: talentsError } = await supabase.rpc('create_talents_table');
    if (talentsError) {
      console.log('Talents table might already exist or error:', talentsError.message);
    }

    // 5. Partners テーブル
    const { error: partnersError } = await supabase.rpc('create_partners_table');
    if (partnersError) {
      console.log('Partners table might already exist or error:', partnersError.message);
    }

    // 6. Follows テーブル
    const { error: followsError } = await supabase.rpc('create_follows_table');
    if (followsError) {
      console.log('Follows table might already exist or error:', followsError.message);
    }

    // 7. Matches テーブル
    const { error: matchesError } = await supabase.rpc('create_matches_table');
    if (matchesError) {
      console.log('Matches table might already exist or error:', matchesError.message);
    }

    // 8. Partner Projects テーブル
    const { error: partnerProjectsError } = await supabase.rpc('create_partner_projects_table');
    if (partnerProjectsError) {
      console.log('Partner Projects table might already exist or error:', partnerProjectsError.message);
    }

    // 9. Partner Talents テーブル
    const { error: partnerTalentsError } = await supabase.rpc('create_partner_talents_table');
    if (partnerTalentsError) {
      console.log('Partner Talents table might already exist or error:', partnerTalentsError.message);
    }

    // 10. Shares テーブル
    const { error: sharesError } = await supabase.rpc('create_shares_table');
    if (sharesError) {
      console.log('Shares table might already exist or error:', sharesError.message);
    }

    console.log('Database initialization completed');
    return { success: true };

  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error: error.message };
  }
}

// データベーステーブルを作成するSQL関数群
export const CREATE_TABLES_SQL = {
  // 1. Companies テーブル
  companies: `
    CREATE OR REPLACE FUNCTION create_companies_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
        CREATE TABLE companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('client', 'agency', 'freelancer')),
          website VARCHAR(500),
          address TEXT,
          contact_person VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          employee_count VARCHAR(50),
          description TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_companies_type ON companies(type);
        CREATE INDEX idx_companies_status ON companies(status);
        CREATE INDEX idx_companies_is_verified ON companies(is_verified);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 2. Users テーブル
  users: `
    CREATE OR REPLACE FUNCTION create_users_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(20) DEFAULT 'company' CHECK (role IN ('admin', 'company', 'user')),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          name VARCHAR(255),
          position VARCHAR(255),
          department VARCHAR(255),
          phone VARCHAR(50),
          avatar VARCHAR(500),
          timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
          language VARCHAR(5) DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
          notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
          last_login_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_role ON users(role);
        CREATE INDEX idx_users_company_id ON users(company_id);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 3. Projects テーブル
  projects: `
    CREATE OR REPLACE FUNCTION create_projects_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
        CREATE TABLE projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          detailed_description TEXT,
          recruitment_background TEXT,
          must_skills JSONB DEFAULT '[]',
          nice_skills JSONB DEFAULT '[]',
          budget_min INTEGER,
          budget_max INTEGER,
          work_style VARCHAR(20) CHECK (work_style IN ('onsite', 'remote', 'hybrid')),
          start_date DATE,
          language VARCHAR(255),
          commerce_tier VARCHAR(50),
          commerce_limit VARCHAR(255),
          location VARCHAR(255),
          working_hours VARCHAR(255),
          working_days VARCHAR(255),
          attendance_frequency VARCHAR(255),
          interview_count INTEGER,
          payment_range VARCHAR(255),
          pc_provided BOOLEAN DEFAULT FALSE,
          payment_terms VARCHAR(255),
          age_limit INTEGER,
          foreigner_acceptable BOOLEAN DEFAULT TRUE,
          ng_conditions TEXT,
          development_environment TEXT,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_projects_company_id ON projects(company_id);
        CREATE INDEX idx_projects_work_style ON projects(work_style);
        CREATE INDEX idx_projects_status ON projects(status);
        CREATE INDEX idx_projects_start_date ON projects(start_date);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 4. Talents テーブル
  talents: `
    CREATE OR REPLACE FUNCTION create_talents_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'talents') THEN
        CREATE TABLE talents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          alias VARCHAR(255) NOT NULL,
          name_masked BOOLEAN DEFAULT TRUE,
          age INTEGER,
          gender VARCHAR(20),
          nationality VARCHAR(100),
          affiliation VARCHAR(255),
          nearest_station VARCHAR(255),
          weekly_work_days VARCHAR(50),
          role VARCHAR(255),
          skills JSONB DEFAULT '[]',
          years_by_skill JSONB DEFAULT '{}',
          rate_expect INTEGER,
          location VARCHAR(255),
          availability_from DATE,
          work_style_pref VARCHAR(20) CHECK (work_style_pref IN ('onsite', 'remote', 'hybrid')),
          language VARCHAR(255),
          required_conditions TEXT,
          ng_conditions TEXT,
          summary TEXT,
          status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'engaged', 'unavailable')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_talents_company_id ON talents(company_id);
        CREATE INDEX idx_talents_work_style_pref ON talents(work_style_pref);
        CREATE INDEX idx_talents_status ON talents(status);
        CREATE INDEX idx_talents_availability_from ON talents(availability_from);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 5. Partners テーブル
  partners: `
    CREATE OR REPLACE FUNCTION create_partners_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partners') THEN
        CREATE TABLE partners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(30) CHECK (type IN ('client', 'subcontractor', 'prime_contractor')),
          status VARCHAR(20) DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect')),
          contact_person VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          address TEXT,
          website VARCHAR(500),
          description TEXT,
          rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
          project_count INTEGER DEFAULT 0,
          total_revenue BIGINT DEFAULT 0,
          last_project VARCHAR(255),
          tags JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_partners_type ON partners(type);
        CREATE INDEX idx_partners_status ON partners(status);
        CREATE INDEX idx_partners_rating ON partners(rating);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 6. Follows テーブル
  follows: `
    CREATE OR REPLACE FUNCTION create_follows_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'follows') THEN
        CREATE TABLE follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id UUID NOT NULL,
          following_id UUID NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, following_id)
        );
        
        CREATE INDEX idx_follows_follower_id ON follows(follower_id);
        CREATE INDEX idx_follows_following_id ON follows(following_id);
        CREATE INDEX idx_follows_status ON follows(status);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 7. Matches テーブル
  matches: `
    CREATE OR REPLACE FUNCTION create_matches_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'matches') THEN
        CREATE TABLE matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
          score_total DECIMAL(5,2) NOT NULL,
          decision VARCHAR(5) CHECK (decision IN ('A', 'B', 'C')),
          stage VARCHAR(20) DEFAULT 'draft' CHECK (stage IN ('draft', 'proposed', 'interview', 'won', 'lost', 'no-go')),
          sub_scores JSONB DEFAULT '{}',
          reasons JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_matches_project_id ON matches(project_id);
        CREATE INDEX idx_matches_talent_id ON matches(talent_id);
        CREATE INDEX idx_matches_decision ON matches(decision);
        CREATE INDEX idx_matches_stage ON matches(stage);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 8. Partner Projects テーブル
  partnerProjects: `
    CREATE OR REPLACE FUNCTION create_partner_projects_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_projects') THEN
        CREATE TABLE partner_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          partner_id UUID NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          must_skills JSONB DEFAULT '[]',
          budget_min INTEGER,
          budget_max INTEGER,
          work_style VARCHAR(20) CHECK (work_style IN ('onsite', 'remote', 'hybrid')),
          start_date DATE,
          is_shared BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_partner_projects_partner_id ON partner_projects(partner_id);
        CREATE INDEX idx_partner_projects_is_shared ON partner_projects(is_shared);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 9. Partner Talents テーブル
  partnerTalents: `
    CREATE OR REPLACE FUNCTION create_partner_talents_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_talents') THEN
        CREATE TABLE partner_talents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          partner_id UUID NOT NULL,
          alias VARCHAR(255) NOT NULL,
          skills JSONB DEFAULT '[]',
          years_by_skill JSONB DEFAULT '{}',
          rate_expected INTEGER,
          location VARCHAR(255),
          availability_from DATE,
          work_style_pref VARCHAR(20) CHECK (work_style_pref IN ('onsite', 'remote', 'hybrid')),
          summary TEXT,
          is_shared BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_partner_talents_partner_id ON partner_talents(partner_id);
        CREATE INDEX idx_partner_talents_is_shared ON partner_talents(is_shared);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // 10. Shares テーブル
  shares: `
    CREATE OR REPLACE FUNCTION create_shares_table()
    RETURNS VOID AS $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shares') THEN
        CREATE TABLE shares (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
          recipient_email VARCHAR(255) NOT NULL,
          share_type VARCHAR(20) CHECK (share_type IN ('project', 'talent')),
          is_anonymous BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CHECK ((project_id IS NOT NULL AND talent_id IS NULL AND share_type = 'project') OR
                 (project_id IS NULL AND talent_id IS NOT NULL AND share_type = 'talent'))
        );
        
        CREATE INDEX idx_shares_project_id ON shares(project_id);
        CREATE INDEX idx_shares_talent_id ON shares(talent_id);
        CREATE INDEX idx_shares_recipient_email ON shares(recipient_email);
        CREATE INDEX idx_shares_expires_at ON shares(expires_at);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `
};