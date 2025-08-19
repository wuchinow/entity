'use client';

export default function SimplePage() {
  return (
    <>
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%);
          color: #ffffff;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        
        .container {
          height: 100vh;
          display: flex;
        }
        
        .text-column {
          width: 23%;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .species-info {
          font-size: 20px;
          line-height: 2.2;
          font-weight: 300;
          letter-spacing: 0.5px;
        }
        
        .species-info div {
          margin-bottom: 30px;
        }
        
        .media-column {
          width: 77%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .loading {
          text-align: center;
        }
        
        .spinner {
          width: 60px;
          height: 60px;
          border: 3px solid #ffffff;
          border-top: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 30px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .status {
          font-size: 14px;
          color: #999999;
          margin-top: 40px;
          font-weight: 300;
          letter-spacing: 0.3px;
        }
      `}</style>
      
      <div className="container">
        <div className="text-column">
          <div className="species-info">
            <div>Entity v1.0</div>
            <div>Extinct Species Generator</div>
            <div>Awaiting species data...</div>
          </div>
          <div className="status">
            Gallery installation interface
          </div>
        </div>
        
        <div className="media-column">
          <div className="loading">
            <div className="spinner"></div>
            <div>Loading...</div>
          </div>
        </div>
      </div>
    </>
  );
}