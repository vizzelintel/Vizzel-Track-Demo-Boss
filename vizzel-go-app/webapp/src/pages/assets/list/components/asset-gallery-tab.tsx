'use client';

import { useEffect, useState } from 'react';
import { getAssetCheckHistory } from '@/lib/assets';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatThaiDate } from '@/lib/utils';
import { Loader2, Image as ImageIcon, Calendar, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEST_IDS } from '@/components/test-ids';

interface AssetGalleryTabProps {
  assetID: number;
  usersList?: any[]; // For resolving names
}

export function AssetGalleryTab({ assetID, usersList = [] }: AssetGalleryTabProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (assetID) {
      loadHistory();
    }
  }, [assetID]);

  async function loadHistory() {
    setLoading(true);
    console.log('🖼️ Fetching gallery for assetID:', assetID);
    try {
      const res = await getAssetCheckHistory(assetID);
      console.log('🖼️ Check History Response:', res);
      setHistory(res.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract all images from the logs history
  const allImages = history.flatMap(log => {
    return (log.images || []).map((img: any) => {
      // Resolve job name: foundOnJob takes priority, fallback to assignedJob
      const jobName = log.foundOnJob?.name || log.assignedJob?.name || 'ไม่ระบุรอบงาน';
      
      // Resolve user name
      const user = usersList.find(u => Number(u.user?.id) === Number(img.createdBy));
      const userName = user ? `${user.user.name} ${user.user.surname || ''}`.trim() : `ผู้ตรวจ ID: ${img.createdBy}`;

      return {
        ...img,
        jobName,
        userName,
      };
    });
  });

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="mt-4 text-sm text-muted-foreground">กำลังโหลดรูปภาพประวัติ...</span>
      </div>
    );
  }

  if (allImages.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
        <p>ยังไม่มีรูปภาพจากการตรวจนับ</p>
      </div>
    );
  }

  const renderedImages = allImages.map(img => {
    let cleanPath = img.image || '';
    cleanPath = cleanPath.replace(/\\/g, '/');
    cleanPath = cleanPath.replace(/^backend\//, '').replace(/^frontend\//, '');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    
    // Allow external URLs or fallback to local API uploads
    const imgUrl = cleanPath.startsWith('http') 
      ? cleanPath 
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/${cleanPath}`;
    
    return { ...img, imgUrl };
  });

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {renderedImages.map((img, idx) => (
            <Card 
              key={idx} 
              className="overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-border/50" 
              onClick={() => setLightboxIndex(idx)}
            >
              <div className="aspect-square w-full bg-muted relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.imgUrl} 
                  alt="Asset check" 
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/eeeeee/999999?text=No+Image';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
              <CardContent className="p-3 text-sm flex flex-col gap-1.5 cursor-default bg-card" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span className="font-medium line-clamp-2 leading-tight" title={img.jobName}>{img.jobName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-1 text-xs">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={img.userName}>{img.userName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{img.createdAt ? formatThaiDate(new Date(img.createdAt)) : '-'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-1 bg-black/95 border-border shadow-2xl overflow-hidden [&>button]:text-white [&>button]:right-4 [&>button]:top-4 [&>button]:hover:bg-white/20 [&>button]:z-[60] gap-0" data-testid={TEST_IDS.ASSET_GALLERY.MODAL_GALLERY}>
          <DialogTitle className="sr-only">รูปภาพจากการตรวจนับ {lightboxIndex !== null && renderedImages[lightboxIndex]?.jobName}</DialogTitle>
          <div className="relative flex items-center justify-center w-full min-h-[50vh] sm:h-[85vh] p-2 sm:p-4 mt-8 sm:mt-0">
            {lightboxIndex !== null && renderedImages[lightboxIndex] && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={renderedImages[lightboxIndex].imgUrl}
                  alt="Enlarged history"
                  className="max-h-[80vh] sm:max-h-[85vh] max-w-full object-contain mx-auto rounded shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/eeeeee/999999?text=Error';
                  }}
                />
                
                {renderedImages.length > 1 && (
                  <>
                    <button
                      className="absolute top-1/2 left-2 sm:left-6 -translate-y-1/2 rounded-full bg-black/60 p-2 sm:p-3 text-white hover:text-white hover:bg-black/80 transition-all z-50 border border-white/10"
                      data-testid={TEST_IDS.ASSET_GALLERY.BUTTON_PREV_IMAGE}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) => (prev! - 1 + renderedImages.length) % renderedImages.length);
                      }}
                    >
                      <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>
                    <button
                      className="absolute top-1/2 right-2 sm:right-6 -translate-y-1/2 rounded-full bg-black/60 p-2 sm:p-3 text-white hover:text-white hover:bg-black/80 transition-all z-50 border border-white/10"
                      data-testid={TEST_IDS.ASSET_GALLERY.BUTTON_NEXT_IMAGE}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) => (prev! + 1) % renderedImages.length);
                      }}
                    >
                      <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>
                  </>
                )}
                
                <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 text-center text-white/95 bg-black/70 backdrop-blur-sm py-2 px-3 sm:px-5 rounded-lg mx-auto w-max max-w-[95%] sm:max-w-[80%] z-50 border border-white/10 shadow-lg">
                  <p className="text-sm sm:text-base font-semibold line-clamp-1">{renderedImages[lightboxIndex].jobName}</p>
                  <p className="text-[10px] sm:text-sm text-white/80 mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <span className="flex items-center gap-1"><User className="h-3 w-3 inline" /> {renderedImages[lightboxIndex].userName}</span>
                    <span className="hidden sm:inline opacity-50">|</span> 
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 inline" /> {renderedImages[lightboxIndex].createdAt ? formatThaiDate(new Date(renderedImages[lightboxIndex].createdAt)) : '-'}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
