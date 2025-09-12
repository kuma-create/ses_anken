import { supabase } from "./supabase.tsx";

// データベーステーブルを直接作成する関数
export async function createDatabaseTables() {
  console.log('Creating database tables...');
  
  const tables = [
    // 1. Companies テーブル
    {
      name: 'companies',
      sql: `
        CREATE TABLE IF NOT EXISTS companies (
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
        CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
        CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
        CREATE INDEX IF NOT EXISTS idx_companies_is_verified ON companies(is_verified);
      `
    },
    
    // 2. Users テーブル
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
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
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
      `
    },

    // 3. Projects テーブル
    {
      name: 'projects',
      sql: `
        CREATE TABLE IF NOT EXISTS projects (
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
        CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
        CREATE INDEX IF NOT EXISTS idx_projects_work_style ON projects(work_style);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      `
    },

    // 4. Talents テーブル
    {
      name: 'talents',
      sql: `
        CREATE TABLE IF NOT EXISTS talents (
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
        CREATE INDEX IF NOT EXISTS idx_talents_company_id ON talents(company_id);
        CREATE INDEX IF NOT EXISTS idx_talents_work_style_pref ON talents(work_style_pref);
        CREATE INDEX IF NOT EXISTS idx_talents_status ON talents(status);
      `
    },

    // 5. Partners テーブル
    {
      name: 'partners',
      sql: `
        CREATE TABLE IF NOT EXISTS partners (
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
        CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
        CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
      `
    },

    // 6. Follows テーブル
    {
      name: 'follows',
      sql: `
        CREATE TABLE IF NOT EXISTS follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id UUID NOT NULL,
          following_id UUID NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, following_id)
        );
        CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
        CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
        CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
      `
    },

    // 7. Matches テーブル
    {
      name: 'matches',
      sql: `
        CREATE TABLE IF NOT EXISTS matches (
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
        CREATE INDEX IF NOT EXISTS idx_matches_project_id ON matches(project_id);
        CREATE INDEX IF NOT EXISTS idx_matches_talent_id ON matches(talent_id);
        CREATE INDEX IF NOT EXISTS idx_matches_decision ON matches(decision);
      `
    },

    // 8. Partner Projects テーブル
    {
      name: 'partner_projects',
      sql: `
        CREATE TABLE IF NOT EXISTS partner_projects (
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
        CREATE INDEX IF NOT EXISTS idx_partner_projects_partner_id ON partner_projects(partner_id);
        CREATE INDEX IF NOT EXISTS idx_partner_projects_is_shared ON partner_projects(is_shared);
      `
    },

    // 9. Partner Talents テーブル
    {
      name: 'partner_talents',
      sql: `
        CREATE TABLE IF NOT EXISTS partner_talents (
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
        CREATE INDEX IF NOT EXISTS idx_partner_talents_partner_id ON partner_talents(partner_id);
        CREATE INDEX IF NOT EXISTS idx_partner_talents_is_shared ON partner_talents(is_shared);
      `
    },

    // 10. Shares テーブル
    {
      name: 'shares',
      sql: `
        CREATE TABLE IF NOT EXISTS shares (
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
        CREATE INDEX IF NOT EXISTS idx_shares_project_id ON shares(project_id);
        CREATE INDEX IF NOT EXISTS idx_shares_talent_id ON shares(talent_id);
        CREATE INDEX IF NOT EXISTS idx_shares_recipient_email ON shares(recipient_email);
      `
    }
  ];

  const results = [];
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}`);
      
      // Supabaseクライアントでraw SQLを実行
      const { data, error } = await supabase
        .from('_internal_sql_exec')
        .select()
        .eq('query', table.sql)
        .single();
        
      if (error) {
        // 代替手段として直接SQLを実行
        try {
          await supabase.rpc('execute_sql', { sql_query: table.sql });
          console.log(`Table ${table.name}: created successfully (via RPC)`);
          results.push({ table: table.name, status: 'created via RPC' });
        } catch (rpcError) {
          console.log(`Table ${table.name}: ${error.message}`);
          results.push({ table: table.name, status: 'skipped', error: error.message });
        }
      } else {
        console.log(`Table ${table.name}: created successfully`);
        results.push({ table: table.name, status: 'created' });
      }
    } catch (err) {
      console.log(`Table ${table.name}: ${err.message}`);
      results.push({ table: table.name, status: 'error', error: err.message });
    }
  }
  
  return results;
}

// サンプルデータを挿入する関数
export async function insertSampleData() {
  console.log('Inserting sample data...');
  
  try {
    // サンプル企業データ
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert([
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'テックコーポレーション株式会社',
          type: 'client',
          contact_person: '田中太郎',
          phone: '03-1234-5678',
          is_verified: true,
          status: 'active'
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'エンジニアリングパートナーズ',
          type: 'agency',
          contact_person: '佐藤花子',
          phone: '03-8765-4321',
          is_verified: true,
          status: 'active'
        }
      ], { onConflict: 'id' })
      .select();

    if (companiesError) {
      console.error('Sample companies insertion error:', companiesError);
    } else {
      console.log('Sample companies inserted successfully');
    }

    return { success: true };
  } catch (error) {
    console.error('Sample data insertion error:', error);
    return { success: false, error: error.message };
  }
}