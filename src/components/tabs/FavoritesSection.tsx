/**
 * FavoritesSection Component
 *
 * Collapsible section showing pinned/favorite sites.
 */

import React from 'react';
import { StarFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Favorite } from '@/type';
import styles from './FavoritesSection.module.css';

interface FavoritesSectionProps {
  favorites: Favorite[];
  onFavoriteClick: (favorite: Favorite) => void;
}

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  favorites,
  onFavoriteClick
}) => {
  if (favorites.length === 0) {
    return (
      <div className={styles.favoritesSection}>
        <div className={styles.emptyFavorites}>
          <StarFilled className={styles.emptyIcon} />
          <p>No favorites yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.favoritesSection}>
      <div className={styles.favoritesList}>
        {favorites.map((favorite) => (
          <Tooltip key={favorite.id} title={favorite.title} mouseEnterDelay={0.5}>
            <div
              className={styles.favoriteItem}
              onClick={() => onFavoriteClick(favorite)}
              role="button"
              tabIndex={0}
              aria-label={`Favorite: ${favorite.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFavoriteClick(favorite);
                }
              }}
            >
              {favorite.favicon ? (
                <img
                  src={favorite.favicon}
                  alt=""
                  width={20}
                  height={20}
                  className={styles.favoriteFavicon}
                />
              ) : (
                <div className={styles.favoritePlaceholder}>⭐</div>
              )}
              <div className={styles.favoriteTitle}>{favorite.title}</div>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default FavoritesSection;
