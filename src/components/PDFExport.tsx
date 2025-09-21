import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import jsPDF from "jspdf";

interface PDFExportProps {
  className?: string;
}

export function PDFExport({ className = "" }: PDFExportProps) {
  const currentRisk = useQuery(api.burnout.getCurrentRiskScore);
  const velocityMetrics = useQuery(api.linear.getVelocityMetrics, { days: 30 });
  const moodAnalytics = useQuery(api.webcam.getMoodAnalytics, { days: 7 });
  const workHours = useQuery(api.webcam.getWorkSessionAnalytics, { days: 7 });
  const burnoutHistory = useQuery(api.burnout.getBurnoutHistory, { days: 30 });

  // Debug logging
  console.log('PDF Export Data:', {
    currentRisk,
    velocityMetrics,
    moodAnalytics,
    workHours,
    burnoutHistory
  });

  const generatePDF = () => {
    console.log('Starting PDF generation...');
    console.log('Data available:', {
      currentRisk,
      velocityMetrics,
      moodAnalytics,
      workHours,
      burnoutHistory
    });

    // Create new PDF document
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add text with automatic line wrapping
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const maxWidth = pageWidth - x - 20;
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * (options.lineHeight || 7));
    };

    // Helper function to add a section header
    const addSectionHeader = (text: string, y: number) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      
      // Add space before section
      y += 8;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55); // Gray-800
      const newY = addText(text, 20, y, { lineHeight: 6 });
      
      // Add underline
      doc.setLineWidth(1);
      doc.setDrawColor(59, 130, 246); // Blue-500
      doc.line(20, newY + 2, pageWidth - 20, newY + 2);
      
      return newY + 8;
    };

    // Helper function to add a data box
    const addDataBox = (title: string, value: string, x: number, y: number, width: number, height: number) => {
      // Box background
      doc.setFillColor(248, 250, 252); // Gray-50
      doc.roundedRect(x, y, width, height, 4, 4, 'F');
      
      // Box border
      doc.setLineWidth(1);
      doc.setDrawColor(59, 130, 246); // Blue-500
      doc.roundedRect(x, y, width, height, 4, 4, 'S');
      
      // Title background
      doc.setFillColor(59, 130, 246); // Blue-500
      doc.roundedRect(x, y, width, 6, 4, 4, 'F');
      
      // Title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255); // White
      const titleLines = doc.splitTextToSize(title, width - 6);
      doc.text(titleLines, x + 3, y + 4.5);
      
      // Value
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39); // Gray-900
      const valueLines = doc.splitTextToSize(value, width - 6);
      doc.text(valueLines, x + 3, y + 18);
    };

    try {
      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Green-500
      addText('TouchGrass', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(18);
      doc.setTextColor(107, 114, 128); // Gray-500
      addText('Burnout Prevention Report', 20, yPosition);
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175); // Gray-400
      addText(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPosition);
      
      yPosition += 15;

      // Add main content divider
      doc.setLineWidth(1);
      doc.setDrawColor(229, 231, 235); // Gray-200
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Current Risk Score Section
      yPosition = addSectionHeader('Current Burnout Risk', yPosition);
      
      if (currentRisk) {
        // Check if we need a new page for risk section
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Risk score display in a box
        const riskColor = formatRiskLevel(currentRisk.riskScore).color;
        const riskRgb = riskColor === '#dc2626' ? [220, 38, 38] : riskColor === '#f59e0b' ? [245, 158, 11] : [16, 185, 129];
        
        // Draw risk score box
        doc.setLineWidth(2);
        doc.setDrawColor(riskRgb[0], riskRgb[1], riskRgb[2]);
        doc.roundedRect(20, yPosition, 70, 30, 4, 4, 'S');
        
        // Risk score background
        doc.setFillColor(riskRgb[0] + 30, riskRgb[1] + 30, riskRgb[2] + 30);
        doc.roundedRect(20, yPosition, 70, 30, 4, 4, 'F');
        
        // Risk score percentage
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(riskRgb[0], riskRgb[1], riskRgb[2]);
        addText(`${currentRisk.riskScore}%`, 25, yPosition + 12);
        
        // Risk level
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        addText(`${formatRiskLevel(currentRisk.riskScore).level} Risk`, 25, yPosition + 22);
        
        // Risk factors on the right side - aligned with the box
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        addText('Risk Factors Breakdown:', 100, yPosition + 2);
        
        const factors = [
          `Velocity: ${currentRisk.factors?.velocityScore || 0}%`,
          `Mood: ${currentRisk.factors?.moodScore || 0}%`,
          `Work Hours: ${currentRisk.factors?.workHoursScore || 0}%`,
          `Breaks: ${currentRisk.factors?.breakScore || 0}%`
        ];
        
        if (currentRisk.factors?.commitPatternsScore) {
          factors.push(`Commit Patterns: ${currentRisk.factors.commitPatternsScore}%`);
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        let factorY = yPosition + 8;
        factors.forEach(factor => {
          addText(factor, 100, factorY);
          factorY += 5;
        });
        
        yPosition += 40;
      } else {
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        addText('No risk data available. Connect your integrations to see your burnout risk score.', 20, yPosition);
        yPosition += 20;
      }
      
      yPosition += 12;

      // Add section divider
      doc.setLineWidth(0.5);
      doc.setDrawColor(229, 231, 235); // Gray-200
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      // Additional Data Sections
      if (velocityMetrics) {
        // Check if we need a new page for this section
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('Linear Velocity Metrics', yPosition);
        
        const metrics = [
          { title: 'Total Points', value: `${velocityMetrics.totalPoints || 0}` },
          { title: 'Average Velocity', value: `${(velocityMetrics.averageVelocity || 0).toFixed(1)}` },
          { title: 'Current Trend', value: `${(velocityMetrics.currentTrend || 0) >= 0 ? '+' : ''}${(velocityMetrics.currentTrend || 0).toFixed(1)}` }
        ];
        
        // Check if we have enough space for 3 boxes
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Calculate box positions to fit within page width
        const boxWidth = 55;
        const boxSpacing = 10;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (pageWidth - totalWidth) / 2;
        
        metrics.forEach((metric, index) => {
          const x = startX + index * (boxWidth + boxSpacing);
          addDataBox(metric.title, metric.value, x, yPosition, boxWidth, 30);
        });
        
        yPosition += 40;
      }

      // Add section divider
      if (velocityMetrics) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }

      if (workHours) {
        // Check if we need a new page for this section
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('Work Session Analytics', yPosition);
        
        const workMetrics = [
          { title: 'Total Hours', value: `${workHours.totalHours || 0}h` },
          { title: 'Average/Day', value: `${workHours.averageHours || 0}h` },
          { title: 'Active Sessions', value: `${workHours.activeSessions || 0}` }
        ];
        
        // Check if we have enough space for 3 boxes
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Calculate box positions to fit within page width
        const boxWidth = 55;
        const boxSpacing = 10;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (pageWidth - totalWidth) / 2;
        
        workMetrics.forEach((metric, index) => {
          const x = startX + index * (boxWidth + boxSpacing);
          addDataBox(metric.title, metric.value, x, yPosition, boxWidth, 30);
        });
        
        yPosition += 40;
      }

      // Add section divider
      if (workHours) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }

      if (moodAnalytics) {
        // Check if we need a new page for this section
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('Mood Analytics', yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        addText(`Total Data Points: ${moodAnalytics.totalDataPoints || 0}`, 20, yPosition);
        yPosition += 8;
        
        if (moodAnalytics.currentMood) {
          addText(`Latest Mood: ${moodAnalytics.currentMood.mood} (${moodAnalytics.currentMood.moodScore}%)`, 20, yPosition);
          yPosition += 6;
          addText(`Confidence: ${((moodAnalytics.currentMood.confidence || 0) * 100).toFixed(1)}%`, 20, yPosition);
        } else {
          addText('No recent mood data available', 20, yPosition);
        }
        
        yPosition += 15;
      }

      // Add section divider
      if (moodAnalytics) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 8;
      }

      // Burnout History Section
      if (burnoutHistory && burnoutHistory.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('Burnout History (Last 30 Days)', yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        
        // Show last 7 entries
        const recentHistory = burnoutHistory.slice(0, 7);
        recentHistory.forEach((score, index) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          
          const riskColor = formatRiskLevel(score.riskScore).color;
          const riskRgb = riskColor === '#dc2626' ? [220, 38, 38] : riskColor === '#f59e0b' ? [245, 158, 11] : [16, 185, 129];
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          addText(score.date, 20, yPosition);
          
          doc.setTextColor(riskRgb[0], riskRgb[1], riskRgb[2]);
          addText(`${score.riskScore}% (${formatRiskLevel(score.riskScore).level})`, pageWidth - 60, yPosition);
          
          yPosition += 8;
        });
        
        yPosition += 15;
      }

      // Add major section divider before features
      doc.setLineWidth(1);
      doc.setDrawColor(156, 163, 175); // Gray-400
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 20;

      // TouchGrass Features Section
      // Check if we need a new page for features section BEFORE adding header
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 20;
      }
      
      yPosition = addSectionHeader('TouchGrass Features', yPosition);
      
      const features = [
        { title: 'Real-time Monitoring', desc: 'Track burnout risk with live data from Linear, GitHub, and webcam monitoring' },
        { title: 'Smart Alerts', desc: 'Get notified when it\'s time to take a break and touch grass' },
        { title: 'Analytics Dashboard', desc: 'Visualize work patterns and productivity trends' },
        { title: 'Export Reports', desc: 'Generate PDF reports for managers and health professionals' }
      ];
      
      // Layout features in 2x2 grid with proper spacing
      const boxWidth = 80;
      const boxHeight = 35;
      const spacing = 15;
      const startX = 20;
      
      // Calculate total height needed for all features
      const totalRows = Math.ceil(features.length / 2);
      const totalHeight = (totalRows * boxHeight) + ((totalRows - 1) * spacing);
      
      // If not enough space, move to new page
      if (yPosition + totalHeight > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      features.forEach((feature, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = startX + col * (boxWidth + spacing);
        const y = yPosition + row * (boxHeight + spacing);
        
        // Feature box border
        doc.setLineWidth(0.8);
        doc.setDrawColor(59, 130, 246); // Blue-500
        doc.roundedRect(x, y, boxWidth, boxHeight, 4, 4, 'S');
        
        // Feature box background
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.roundedRect(x, y, boxWidth, boxHeight, 4, 4, 'F');
        
        // Feature title
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175); // Blue-800
        const titleLines = doc.splitTextToSize(feature.title, boxWidth - 12);
        doc.text(titleLines, x + 6, y + 10);
        
        // Feature description - wrap text properly
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 64, 175); // Blue-800
        const descLines = doc.splitTextToSize(feature.desc, boxWidth - 12);
        doc.text(descLines, x + 6, y + 20);
      });
      
      yPosition += totalHeight + 10;

      // Add section divider before recommendations
      doc.setLineWidth(1);
      doc.setDrawColor(156, 163, 175); // Gray-400
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 20;

      // Check if we need a new page for recommendations
      if (yPosition > pageHeight - 150) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Recommendations Section
      yPosition = addSectionHeader('Burnout Prevention Recommendations', yPosition);
      
      const recommendations = [
        'Take regular breaks every 25-30 minutes (Pomodoro Technique)',
        'Step away from your computer for at least 5 minutes every hour',
        'Go outside and touch some grass! Fresh air helps reset your mind',
        'Maintain work-life balance by setting clear boundaries',
        'Stay hydrated and maintain proper posture',
        'Consider adjusting your workload if risk scores remain high',
        'Practice mindfulness or meditation during breaks',
        'Ensure adequate sleep (7-9 hours per night)'
      ];
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      
      recommendations.forEach((rec, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        
        addText(`• ${rec}`, 20, yPosition);
        yPosition += 7;
      });
      
      yPosition += 15;

      // Footer
      doc.setLineWidth(0.5);
      doc.setDrawColor(229, 231, 235);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      addText('Generated by TouchGrass - Developer Burnout Prevention System', 20, yPosition);
      yPosition += 5;
      addText('Keep coding sustainably!', 20, yPosition);

      // Save the PDF
      const filename = `TouchGrass-Burnout-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      
      console.log('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatRiskLevel = (score: number) => {
    if (score >= 75) return { level: 'High', color: '#dc2626' };
    if (score >= 50) return { level: 'Medium', color: '#f59e0b' };
    return { level: 'Low', color: '#10b981' };
  };


  return (
    <div>
      {/* Export Button */}
      <button
        onClick={generatePDF}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
        disabled={!currentRisk}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export PDF Report
      </button>

    </div>
  );
}
